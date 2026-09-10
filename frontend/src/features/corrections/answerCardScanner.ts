import type { StudentAnswerStatus } from "../../types/corrections";
import type { ExamVersion } from "../../types/exams";

const MAX_IMAGE_SIDE = 1800;
const TABLE_WIDTH_MM = (520 / 96) * 25.4;
const ROW_HEIGHT_MM = (34 / 96) * 25.4;
const MARKER_SIZE_MM = 7;
const FRAME_PADDING_MM = 12;
const BUBBLE_RADIUS_MM = (17 / 96) * 25.4 / 2;
const QUESTION_COLUMN_RATIO = 0.24;
const BUBBLE_RADIUS_RATIO = BUBBLE_RADIUS_MM / TABLE_WIDTH_MM;
const TABLE_DETECTION_THRESHOLDS = [185, 165, 205];

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

type CardGeometry = {
  frame: MarkerFrame;
  pointAt: HomographyTransform;
};

type TableFrameCandidate = {
  area: number;
  density: number;
  frame: MarkerFrame;
};

type BubbleSample = {
  fill: number;
  ring: number;
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
  const objectiveQuestions = version.questions.filter((question) => question.questionType !== "DISCURSIVE");
  if (objectiveQuestions.length === 0) {
    throw new Error("Esta prova possui apenas questões abertas e não usa cartão-resposta.");
  }
  const alternativeCount = Math.max(2, ...objectiveQuestions.map((question) => question.alternatives.length));
  const tableHeightMm = (version.questions.length + 1) * ROW_HEIGHT_MM;
  const geometry = findCardGeometry(imageData, version, alternativeCount, tableHeightMm);
  if (!geometry) {
    throw new Error("Não encontrei a grade do cartão. Fotografe a folha inteira, com boa luz e sem cobrir a tabela.");
  }

  const answers = version.questions.flatMap((question, questionIndex) => {
    if (question.questionType === "DISCURSIVE") {
      return [];
    }
    const options = question.alternatives.map((alternative, alternativeIndex) => {
      const u = alternativePosition(alternativeIndex, alternativeCount);
      const v = questionPosition(questionIndex, version.questions.length);
      const center = geometry.pointAt(u, v);
      const radius = Math.max(4, distance(center, geometry.pointAt(u + BUBBLE_RADIUS_RATIO, v)));
      return {
        alternativeId: alternative.alternativeId,
        center,
        radius,
        fill: sampleBubble(imageData, center, radius).fill
      };
    });

    const ordered = [...options].sort((left, right) => right.fill - left.fill);
    const strongest = ordered[0];
    const secondStrongest = ordered[1];
    const difference = strongest.fill - (secondStrongest?.fill ?? 0);
    const confidence = Math.max(0, Math.min(1, strongest.fill * 0.9 + difference * 1.5));

    let status: ImportedAnswer["status"] = "NEEDS_REVIEW";
    let selectedAlternativeId: string | null = null;
    if (strongest.fill < 0.12) {
      status = "BLANK";
    } else if (strongest.fill >= 0.19 && difference >= 0.09) {
      status = "DETECTED";
      selectedAlternativeId = strongest.alternativeId;
    }

    return [{
      questionId: question.id,
      selectedAlternativeId,
      status,
      confidence,
      center: strongest.center,
      radius: strongest.radius
    }];
  });

  drawScanOverlay(context, geometry.frame, answers);

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

function findCardGeometry(
  imageData: ImageData,
  version: ExamVersion,
  alternativeCount: number,
  tableHeightMm: number
): CardGeometry | null {
  const tableGeometry = findTableGeometry(imageData, version, alternativeCount, tableHeightMm);
  if (tableGeometry) {
    return tableGeometry;
  }

  const markerFrame = findMarkerFrame(imageData);
  if (!markerFrame) {
    return null;
  }

  const markerTransform = buildHomography(markerFrame);
  const pointAt = (u: number, v: number) => pointAtTablePosition(
    markerTransform,
    u * TABLE_WIDTH_MM,
    v * tableHeightMm,
    tableHeightMm
  );

  return scoreBubbleLayout(imageData, pointAt, version, alternativeCount) >= 0.025
    ? { frame: markerFrame, pointAt }
    : null;
}

function findTableGeometry(
  imageData: ImageData,
  version: ExamVersion,
  alternativeCount: number,
  tableHeightMm: number
): CardGeometry | null {
  const expectedAspectRatio = TABLE_WIDTH_MM / tableHeightMm;
  const matches: Array<{ geometry: CardGeometry; layoutScore: number; score: number }> = [];

  for (const threshold of TABLE_DETECTION_THRESHOLDS) {
    const candidates = findTableFrameCandidates(imageData, threshold);
    for (const candidate of candidates) {
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const frame = rotateFrame(candidate.frame, rotation);
        const frameWidth = (distance(frame.topLeft, frame.topRight) + distance(frame.bottomLeft, frame.bottomRight)) / 2;
        const frameHeight = (distance(frame.topLeft, frame.bottomLeft) + distance(frame.topRight, frame.bottomRight)) / 2;
        if (frameWidth <= 0 || frameHeight <= 0) {
          continue;
        }

        const aspectScore = Math.exp(-Math.abs(Math.log((frameWidth / frameHeight) / expectedAspectRatio)) * 2.4);
        if (aspectScore < 0.34) {
          continue;
        }

        const pointAt = buildHomography(frame);
        const layoutScore = scoreBubbleLayout(imageData, pointAt, version, alternativeCount);
        const areaScore = Math.min(1, candidate.area / (imageData.width * imageData.height * 0.12));
        const densityScore = Math.min(1, candidate.density / 0.07);
        const score = layoutScore * 8 + aspectScore * 0.35 + areaScore * 0.08 + densityScore * 0.05;

        matches.push({ geometry: { frame, pointAt }, layoutScore, score });
      }
    }

    matches.sort((left, right) => right.score - left.score);
    if (matches[0]?.layoutScore >= 0.055) {
      break;
    }
  }

  const best = matches[0];
  return best?.layoutScore >= 0.028 ? best.geometry : null;
}

function findTableFrameCandidates(imageData: ImageData, luminanceThreshold: number): TableFrameCandidate[] {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const darkPixels = new Uint8Array(pixelCount);
  const visited = new Uint8Array(pixelCount);
  const stack = new Int32Array(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    darkPixels[index] = luminance < luminanceThreshold ? 1 : 0;
  }

  const candidates: TableFrameCandidate[] = [];
  const imageArea = pixelCount;
  const minimumSide = Math.min(width, height) * 0.06;

  for (let start = 0; start < pixelCount; start += 1) {
    if (!darkPixels[start] || visited[start]) {
      continue;
    }

    let stackSize = 0;
    stack[stackSize] = start;
    stackSize += 1;
    visited[start] = 1;

    let count = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let minSum = Number.POSITIVE_INFINITY;
    let maxSum = Number.NEGATIVE_INFINITY;
    let minDifference = Number.POSITIVE_INFINITY;
    let maxDifference = Number.NEGATIVE_INFINITY;
    let minSumPoint: Point = { x: 0, y: 0 };
    let maxSumPoint: Point = { x: 0, y: 0 };
    let minDifferencePoint: Point = { x: 0, y: 0 };
    let maxDifferencePoint: Point = { x: 0, y: 0 };

    while (stackSize > 0) {
      stackSize -= 1;
      const index = stack[stackSize];
      const y = Math.floor(index / width);
      const x = index - y * width;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const sum = x + y;
      const difference = x - y;
      if (sum < minSum) {
        minSum = sum;
        minSumPoint = { x, y };
      }
      if (sum > maxSum) {
        maxSum = sum;
        maxSumPoint = { x, y };
      }
      if (difference < minDifference) {
        minDifference = difference;
        minDifferencePoint = { x, y };
      }
      if (difference > maxDifference) {
        maxDifference = difference;
        maxDifferencePoint = { x, y };
      }

      const fromY = Math.max(0, y - 1);
      const toY = Math.min(height - 1, y + 1);
      const fromX = Math.max(0, x - 1);
      const toX = Math.min(width - 1, x + 1);
      for (let neighborY = fromY; neighborY <= toY; neighborY += 1) {
        for (let neighborX = fromX; neighborX <= toX; neighborX += 1) {
          const neighbor = neighborY * width + neighborX;
          if (darkPixels[neighbor] && !visited[neighbor]) {
            visited[neighbor] = 1;
            stack[stackSize] = neighbor;
            stackSize += 1;
          }
        }
      }
    }

    if (count < 240) {
      continue;
    }

    const boundingArea = (maxX - minX + 1) * (maxY - minY + 1);
    if (boundingArea < imageArea * 0.006 || boundingArea > imageArea * 0.68) {
      continue;
    }

    const frame: MarkerFrame = {
      topLeft: minSumPoint,
      topRight: maxDifferencePoint,
      bottomRight: maxSumPoint,
      bottomLeft: minDifferencePoint
    };
    const frameArea = polygonArea([frame.topLeft, frame.topRight, frame.bottomRight, frame.bottomLeft]);
    const sideLengths = [
      distance(frame.topLeft, frame.topRight),
      distance(frame.topRight, frame.bottomRight),
      distance(frame.bottomRight, frame.bottomLeft),
      distance(frame.bottomLeft, frame.topLeft)
    ];
    const density = count / Math.max(1, frameArea);
    if (
      frameArea < imageArea * 0.005
      || frameArea > imageArea * 0.65
      || Math.min(...sideLengths) < minimumSide
      || density < 0.008
      || density > 0.36
    ) {
      continue;
    }

    candidates.push({ area: frameArea, density, frame });
  }

  return candidates.sort((left, right) => right.area * right.density - left.area * left.density).slice(0, 12);
}

function scoreBubbleLayout(
  imageData: ImageData,
  pointAt: HomographyTransform,
  version: ExamVersion,
  alternativeCount: number
) {
  let score = 0;
  let sampleCount = 0;

  version.questions.forEach((question, questionIndex) => {
    question.alternatives.forEach((_, alternativeIndex) => {
      const u = alternativePosition(alternativeIndex, alternativeCount);
      const v = questionPosition(questionIndex, version.questions.length);
      const center = pointAt(u, v);
      const radius = Math.max(4, distance(center, pointAt(u + BUBBLE_RADIUS_RATIO, v)));
      const sample = sampleBubble(imageData, center, radius);
      score += Math.max(0, sample.ring) * 0.82 + Math.max(0, sample.fill) * 0.28;
      sampleCount += 1;
    });
  });

  return sampleCount ? score / sampleCount : 0;
}

function rotateFrame(frame: MarkerFrame, rotation: number): MarkerFrame {
  const corners = [frame.topLeft, frame.topRight, frame.bottomRight, frame.bottomLeft];
  return {
    topLeft: corners[rotation % 4],
    topRight: corners[(rotation + 1) % 4],
    bottomRight: corners[(rotation + 2) % 4],
    bottomLeft: corners[(rotation + 3) % 4]
  };
}

function alternativePosition(index: number, alternativeCount: number) {
  return QUESTION_COLUMN_RATIO + ((index + 0.5) * (1 - QUESTION_COLUMN_RATIO)) / alternativeCount;
}

function questionPosition(index: number, questionCount: number) {
  return (index + 1.5) / (questionCount + 1);
}

function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
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

function sampleBubble(imageData: ImageData, center: Point, radius: number): BubbleSample {
  const { width, height, data } = imageData;
  const innerRadius = Math.max(2.5, radius * 0.62);
  const ringRadiusMin = radius * 0.78;
  const ringRadiusMax = radius * 1.22;
  const backgroundRadiusMin = radius * 1.38;
  const backgroundRadiusMax = radius * 1.75;

  const minX = Math.max(0, Math.floor(center.x - backgroundRadiusMax));
  const maxX = Math.min(width - 1, Math.ceil(center.x + backgroundRadiusMax));
  const minY = Math.max(0, Math.floor(center.y - backgroundRadiusMax));
  const maxY = Math.min(height - 1, Math.ceil(center.y + backgroundRadiusMax));

  let innerDarknessSum = 0;
  let innerPixels = 0;
  let ringDarknessSum = 0;
  let ringPixels = 0;
  let backgroundDarknessSum = 0;
  let backgroundPixels = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const normalizedDistance = Math.hypot(x - center.x, y - center.y) / radius;
      const offset = (y * width + x) * 4;
      const luminance = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      const darkness = 1 - luminance / 255;

      if (normalizedDistance <= innerRadius / radius) {
        innerDarknessSum += darkness;
        innerPixels += 1;
      } else if (normalizedDistance >= ringRadiusMin / radius && normalizedDistance <= ringRadiusMax / radius) {
        ringDarknessSum += darkness;
        ringPixels += 1;
      } else if (
        normalizedDistance >= backgroundRadiusMin / radius
        && normalizedDistance <= backgroundRadiusMax / radius
      ) {
        backgroundDarknessSum += darkness;
        backgroundPixels += 1;
      }
    }
  }

  const innerDarkness = innerPixels ? innerDarknessSum / innerPixels : 0;
  const ringDarkness = ringPixels ? ringDarknessSum / ringPixels : 0;
  const backgroundDarkness = backgroundPixels ? backgroundDarknessSum / backgroundPixels : 0;

  return {
    fill: Math.max(0, Math.min(1, innerDarkness - backgroundDarkness)),
    ring: Math.max(-1, Math.min(1, ringDarkness - backgroundDarkness))
  };
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
