import type { StudentAnswerStatus } from "../../types/corrections";
import type { ExamVersion } from "../../types/exams";

const MAX_IMAGE_SIDE = 1800;
const TABLE_WIDTH_MM = (520 / 96) * 25.4;
const ROW_HEIGHT_MM = (34 / 96) * 25.4;
const MARKER_SIZE_MM = 7;
const FRAME_PADDING_MM = 12;
const BUBBLE_RADIUS_MM = (17 / 96) * 25.4 / 2;
const QUESTION_COLUMN_RATIO = 0.24;

type Point = {
  x: number;
  y: number;
};

type MarkerCandidate = Point & {
  density: number;
  size: number;
};

type MarkerFrame = {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
};

export type ImportedAnswer = {
  questionId: string;
  selectedAlternativeId: string | null;
  status: Extract<StudentAnswerStatus, "DETECTED" | "BLANK" | "NEEDS_REVIEW">;
  confidence: number;
};

export type AnswerCardScanResult = {
  answers: ImportedAnswer[];
  previewUrl: string;
  detectedCount: number;
  blankCount: number;
  reviewCount: number;
  imageWidth: number;
  imageHeight: number;
};

export async function scanAnswerCard(file: File, version: ExamVersion): Promise<AnswerCardScanResult> {
  const source = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    source.close();
    throw new Error("Não foi possível preparar a imagem do cartão.");
  }

  context.drawImage(source, 0, 0, width, height);
  source.close();

  if (width < 500 || height < 500) {
    throw new Error("A foto está pequena demais. Envie uma imagem nítida do cartão inteiro.");
  }

  const imageData = context.getImageData(0, 0, width, height);
  const frame = findMarkerFrame(imageData);
  if (!frame) {
    throw new Error("Não encontrei os quatro marcadores do cartão. Fotografe o cartão inteiro, reto e bem iluminado.");
  }

  const alternativeCount = Math.max(2, ...version.questions.map((question) => question.alternatives.length));
  const tableHeightMm = (version.questions.length + 1) * ROW_HEIGHT_MM;
  const transform = buildHomography(frame);
  const answers = version.questions.map((question, questionIndex) => {
    const options = question.alternatives.map((alternative, alternativeIndex) => {
      const xMm = TABLE_WIDTH_MM * (QUESTION_COLUMN_RATIO + ((alternativeIndex + 0.5) * (1 - QUESTION_COLUMN_RATIO)) / alternativeCount);
      const yMm = ROW_HEIGHT_MM * (questionIndex + 1.5);
      const center = pointAtTablePosition(transform, xMm, yMm, tableHeightMm);
      const radius = Math.max(5, distance(center, pointAtTablePosition(transform, xMm + BUBBLE_RADIUS_MM, yMm, tableHeightMm)));
      return {
        alternativeId: alternative.alternativeId,
        center,
        radius,
        fill: sampleFill(imageData, center, radius)
      };
    });

    const ordered = [...options].sort((left, right) => right.fill - left.fill);
    const strongest = ordered[0];
    const secondStrongest = ordered[1];
    const difference = strongest.fill - (secondStrongest?.fill ?? 0);
    const confidence = Math.max(0, Math.min(1, strongest.fill * 0.7 + difference * 1.15));

    let status: ImportedAnswer["status"] = "NEEDS_REVIEW";
    let selectedAlternativeId: string | null = null;
    if (strongest.fill < 0.1) {
      status = "BLANK";
    } else if (strongest.fill >= 0.27 && difference >= 0.12) {
      status = "DETECTED";
      selectedAlternativeId = strongest.alternativeId;
    }

    return {
      questionId: question.id,
      selectedAlternativeId,
      status,
      confidence,
      center: strongest.center,
      radius: strongest.radius
    };
  });

  drawScanOverlay(context, frame, answers);

  return {
    answers: answers.map(({ questionId, selectedAlternativeId, status, confidence }) => ({ questionId, selectedAlternativeId, status, confidence })),
    previewUrl: canvas.toDataURL("image/jpeg", 0.86),
    detectedCount: answers.filter((answer) => answer.status === "DETECTED").length,
    blankCount: answers.filter((answer) => answer.status === "BLANK").length,
    reviewCount: answers.filter((answer) => answer.status === "NEEDS_REVIEW").length,
    imageWidth: width,
    imageHeight: height
  };
}

function findMarkerFrame(imageData: ImageData): MarkerFrame | null {
  const { width, height, data } = imageData;
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    for (let x = 1; x <= width; x += 1) {
      const pixelOffset = ((y - 1) * width + (x - 1)) * 4;
      const luminance = data[pixelOffset] * 0.2126 + data[pixelOffset + 1] * 0.7152 + data[pixelOffset + 2] * 0.0722;
      if (luminance < 92) {
        rowSum += 1;
      }
      integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + rowSum;
    }
  }

  const candidates: MarkerCandidate[] = [];
  const scanSizes = [0.012, 0.018, 0.024, 0.032, 0.042, 0.055].map((ratio) => Math.max(10, Math.round(width * ratio)));
  for (const size of scanSizes) {
    const step = Math.max(3, Math.round(size / 3));
    for (let y = 0; y <= height - size; y += step) {
      for (let x = 0; x <= width - size; x += step) {
        const density = darkDensity(integral, width, x, y, size, size);
        if (density >= 0.82) {
          candidates.push({ x: x + size / 2, y: y + size / 2, size, density });
        }
      }
    }
  }

  const markers = clusterMarkers(candidates).slice(0, 36);
  return chooseMarkerFrame(markers, width);
}

function darkDensity(integral: Uint32Array, width: number, x: number, y: number, rectangleWidth: number, rectangleHeight: number) {
  const stride = width + 1;
  const sum = integral[(y + rectangleHeight) * stride + x + rectangleWidth]
    - integral[y * stride + x + rectangleWidth]
    - integral[(y + rectangleHeight) * stride + x]
    + integral[y * stride + x];
  return sum / (rectangleWidth * rectangleHeight);
}

function clusterMarkers(candidates: MarkerCandidate[]) {
  const clusters: MarkerCandidate[] = [];
  for (const candidate of candidates.sort((left, right) => right.density ** 2 * right.size - left.density ** 2 * left.size)) {
    const existing = clusters.find((marker) => Math.abs(marker.x - candidate.x) < Math.max(marker.size, candidate.size) * 0.75
      && Math.abs(marker.y - candidate.y) < Math.max(marker.size, candidate.size) * 0.75);
    if (!existing) {
      clusters.push(candidate);
    }
  }
  return clusters.sort((left, right) => right.density ** 2 * right.size - left.density ** 2 * left.size);
}

function chooseMarkerFrame(markers: MarkerCandidate[], imageWidth: number): MarkerFrame | null {
  let best: { frame: MarkerFrame; score: number } | null = null;
  for (const topLeft of markers) {
    for (const topRight of markers) {
      const horizontalDistance = topRight.x - topLeft.x;
      if (horizontalDistance < imageWidth * 0.28 || Math.abs(topRight.y - topLeft.y) > horizontalDistance * 0.16) {
        continue;
      }
      for (const bottomLeft of markers) {
        const leftHeight = bottomLeft.y - topLeft.y;
        if (leftHeight < horizontalDistance * 0.2 || Math.abs(bottomLeft.x - topLeft.x) > horizontalDistance * 0.15) {
          continue;
        }
        for (const bottomRight of markers) {
          const rightHeight = bottomRight.y - topRight.y;
          const horizontalMismatch = Math.abs(bottomRight.x - topRight.x) + Math.abs(bottomRight.y - bottomLeft.y);
          const verticalMismatch = Math.abs(leftHeight - rightHeight);
          if (
            rightHeight < horizontalDistance * 0.2
            || horizontalMismatch > horizontalDistance * 0.25
            || verticalMismatch > horizontalDistance * 0.2
          ) {
            continue;
          }
          const density = topLeft.density + topRight.density + bottomLeft.density + bottomRight.density;
          const score = density * 100 + horizontalDistance / imageWidth - (horizontalMismatch + verticalMismatch) / horizontalDistance;
          if (!best || score > best.score) {
            best = { frame: { topLeft, topRight, bottomLeft, bottomRight }, score };
          }
        }
      }
    }
  }
  return best?.frame ?? null;
}

type HomographyTransform = (u: number, v: number) => Point;

function buildHomography(frame: MarkerFrame): HomographyTransform {
  const x0 = frame.topLeft.x;
  const y0 = frame.topLeft.y;
  const x1 = frame.topRight.x;
  const y1 = frame.topRight.y;
  const x2 = frame.bottomRight.x;
  const y2 = frame.bottomRight.y;
  const x3 = frame.bottomLeft.x;
  const y3 = frame.bottomLeft.y;

  const deltaX1 = x1 - x2;
  const deltaX2 = x3 - x2;
  const sumX = x0 - x1 + x2 - x3;
  const deltaY1 = y1 - y2;
  const deltaY2 = y3 - y2;
  const sumY = y0 - y1 + y2 - y3;

  const denominator = deltaX1 * deltaY2 - deltaX2 * deltaY1;

  if (Math.abs(sumX) < 1e-4 && Math.abs(sumY) < 1e-4) {
    // Affine transformation
    const a = x1 - x0;
    const b = x3 - x0;
    const c = x0;
    const d = y1 - y0;
    const e = y3 - y0;
    const f = y0;
    return (u: number, v: number) => ({
      x: a * u + b * v + c,
      y: d * u + e * v + f
    });
  }

  if (Math.abs(denominator) < 1e-6) {
    // Fallback to bilinear interpolation if collinear/degenerate
    return (u: number, v: number) => {
      const top = interpolate(frame.topLeft, frame.topRight, u);
      const bottom = interpolate(frame.bottomLeft, frame.bottomRight, u);
      return interpolate(top, bottom, v);
    };
  }

  const g = (sumX * deltaY2 - deltaX2 * sumY) / denominator;
  const h = (deltaX1 * sumY - sumX * deltaY1) / denominator;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  return (u: number, v: number) => {
    const divisor = g * u + h * v + 1;
    if (Math.abs(divisor) < 1e-6) {
      return { x: c, y: f };
    }
    return {
      x: (a * u + b * v + c) / divisor,
      y: (d * u + e * v + f) / divisor
    };
  };
}

function pointAtTablePosition(transform: HomographyTransform, xMm: number, yMm: number, tableHeightMm: number): Point {
  const markerWidthMm = TABLE_WIDTH_MM + FRAME_PADDING_MM * 2 - MARKER_SIZE_MM;
  const markerHeightMm = tableHeightMm + FRAME_PADDING_MM * 2 - MARKER_SIZE_MM;
  const u = (FRAME_PADDING_MM - MARKER_SIZE_MM / 2 + xMm) / markerWidthMm;
  const v = (FRAME_PADDING_MM - MARKER_SIZE_MM / 2 + yMm) / markerHeightMm;
  return transform(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
}

function sampleFill(imageData: ImageData, center: Point, radius: number) {
  const { width, height, data } = imageData;
  const innerRadius = Math.max(3, radius * 0.65);
  const outerRadiusMin = radius * 0.95;
  const outerRadiusMax = radius * 1.55;

  const minX = Math.max(0, Math.floor(center.x - outerRadiusMax));
  const maxX = Math.min(width - 1, Math.ceil(center.x + outerRadiusMax));
  const minY = Math.max(0, Math.floor(center.y - outerRadiusMax));
  const maxY = Math.min(height - 1, Math.ceil(center.y + outerRadiusMax));

  let innerLuminanceSum = 0;
  let innerPixels = 0;
  let backgroundLuminanceSum = 0;
  let backgroundPixels = 0;
  let darkPixelCount = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distSq = (x - center.x) ** 2 + (y - center.y) ** 2;
      const offset = (y * width + x) * 4;
      const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;

      if (distSq <= innerRadius ** 2) {
        innerLuminanceSum += luminance;
        innerPixels += 1;
        if (luminance < 155) {
          darkPixelCount += 1;
        }
      } else if (distSq >= outerRadiusMin ** 2 && distSq <= outerRadiusMax ** 2) {
        backgroundLuminanceSum += luminance;
        backgroundPixels += 1;
      }
    }
  }

  const avgInner = innerPixels ? innerLuminanceSum / innerPixels : 255;
  const avgBg = backgroundPixels ? backgroundLuminanceSum / backgroundPixels : 240;
  const relativeContrast = Math.max(0, (avgBg - avgInner) / 255);
  const absoluteDarkness = innerPixels ? darkPixelCount / innerPixels : 0;

  // Composite fill score balancing local relative contrast and raw darkness
  return Math.min(1, relativeContrast * 0.75 + absoluteDarkness * 0.55);
}

function drawScanOverlay(
  context: CanvasRenderingContext2D,
  frame: MarkerFrame,
  answers: Array<ImportedAnswer & { center: Point; radius: number }>
) {
  context.lineWidth = 3;
  context.strokeStyle = "#0f766e";
  context.beginPath();
  context.moveTo(frame.topLeft.x, frame.topLeft.y);
  context.lineTo(frame.topRight.x, frame.topRight.y);
  context.lineTo(frame.bottomRight.x, frame.bottomRight.y);
  context.lineTo(frame.bottomLeft.x, frame.bottomLeft.y);
  context.closePath();
  context.stroke();

  for (const answer of answers) {
    context.strokeStyle = answer.status === "DETECTED" ? "#15803d" : answer.status === "BLANK" ? "#475569" : "#d97706";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(answer.center.x, answer.center.y, answer.radius * 1.35, 0, Math.PI * 2);
    context.stroke();
  }
}

function interpolate(start: Point, end: Point, ratio: number): Point {
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
