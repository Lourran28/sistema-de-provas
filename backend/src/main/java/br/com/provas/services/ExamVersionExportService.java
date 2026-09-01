package br.com.provas.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.Document;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.provas.dtos.exams.ExamResponse;
import br.com.provas.dtos.versions.ExamVersionAlternativeResponse;
import br.com.provas.dtos.versions.ExamVersionQuestionResponse;
import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.security.UserPrincipal;

@Service
public class ExamVersionExportService {

    private static final Pattern DATA_IMAGE_PATTERN = Pattern.compile(
            "^data:image/(png|jpe?g);base64,([a-zA-Z0-9+/=\\r\\n]+)$",
            Pattern.CASE_INSENSITIVE);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final int MAX_REMOTE_IMAGE_SIZE = 650_000;
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    private final ExamVersionService examVersionService;
    private final ExamService examService;
    private final SubjectService subjectService;

    public ExamVersionExportService(
            ExamVersionService examVersionService,
            ExamService examService,
            SubjectService subjectService) {
        this.examVersionService = examVersionService;
        this.examService = examService;
        this.subjectService = subjectService;
    }

    @Transactional(readOnly = true)
    public ExportedExamDocument export(UserPrincipal teacher, java.util.UUID versionId, ExamExportFormat format) {
        ExamVersionResponse version = examVersionService.get(teacher.id(), versionId);
        ExamResponse exam = examService.get(teacher.id(), version.examId());
        String subjectName = exam.subjectId() == null
                ? "Disciplina não informada"
                : subjectService.findEntity(teacher.id(), exam.subjectId()).getName();
        ExportPayload payload = new ExportPayload(exam, version, subjectName, teacher.name());
        byte[] content = format == ExamExportFormat.PDF ? createPdf(payload) : createDocx(payload);
        return new ExportedExamDocument(content, filenameFor(payload, format), format.mediaType());
    }

    private byte[] createDocx(ExportPayload payload) {
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            addDocxTitle(document, payload.exam().title());
            addDocxParagraph(document, "%s - Versão %s".formatted(payload.subjectName(), payload.version().label()), 11, false, 0, 80);
            addDocxParagraph(document, metadataLine(payload), 10, false, 0, 180);
            addDocxParagraph(document, "Aluno(a): _________________________________________________", 11, false, 0, 80);
            addDocxParagraph(document, "Turma: ________________________________", 11, false, 0, 180);

            if (hasText(payload.exam().instructions())) {
                addDocxParagraph(document, "Instruções", 11, true, 0, 70);
                addDocxParagraph(document, payload.exam().instructions(), 10, false, 0, 180);
            }

            for (ExamVersionQuestionResponse question : payload.version().questions()) {
                addDocxParagraph(document, "%d. (%s ponto%s) %s".formatted(
                        question.position(),
                        formatScore(question.points()),
                        isSingular(question.points()) ? "" : "s",
                        question.statement()), 11, true, 0, 80);
                loadImage(question.imageUrl()).ifPresent(image -> addDocxImage(document, image));
                for (ExamVersionAlternativeResponse alternative : question.alternatives()) {
                    addDocxParagraph(
                            document,
                            "%s) %s".formatted(letterFor(alternative.position()), alternative.text()),
                            10,
                            false,
                            360,
                            40);
                }
                addDocxParagraph(document, "", 10, false, 0, 100);
            }

            document.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível criar o arquivo Word da prova.", exception);
        }
    }

    private byte[] createPdf(ExportPayload payload) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfPageWriter writer = new PdfPageWriter(document);
            writer.paragraph(payload.exam().title(), true, 17, 21, 0, 8);
            writer.paragraph("%s - Versão %s".formatted(payload.subjectName(), payload.version().label()), false, 10, 14, 0, 3);
            writer.paragraph(metadataLine(payload), false, 9, 13, 0, 12);
            writer.paragraph("Aluno(a): _________________________________________________", false, 10, 14, 0, 3);
            writer.paragraph("Turma: ________________________________", false, 10, 14, 0, 12);

            if (hasText(payload.exam().instructions())) {
                writer.paragraph("Instruções", true, 10, 14, 0, 3);
                writer.paragraph(payload.exam().instructions(), false, 9, 13, 0, 10);
            }

            for (ExamVersionQuestionResponse question : payload.version().questions()) {
                writer.paragraph("%d. (%s ponto%s) %s".formatted(
                        question.position(),
                        formatScore(question.points()),
                        isSingular(question.points()) ? "" : "s",
                        question.statement()), true, 10, 14, 0, 4);
                loadImage(question.imageUrl()).ifPresent(writer::image);
                for (ExamVersionAlternativeResponse alternative : question.alternatives()) {
                    writer.paragraph("%s) %s".formatted(letterFor(alternative.position()), alternative.text()), false, 9, 13, 16, 2);
                }
                writer.space(8);
            }

            writer.close();
            document.save(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível criar o PDF da prova.", exception);
        }
    }

    private void addDocxTitle(XWPFDocument document, String title) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setAlignment(ParagraphAlignment.CENTER);
        paragraph.setSpacingAfter(90);
        XWPFRun run = paragraph.createRun();
        run.setBold(true);
        run.setFontFamily("Arial");
        run.setFontSize(16);
        run.setText(title);
    }

    private void addDocxParagraph(
            XWPFDocument document,
            String text,
            int size,
            boolean bold,
            int indentation,
            int spacingAfter) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setSpacingAfter(spacingAfter);
        paragraph.setIndentationLeft(indentation);
        XWPFRun run = paragraph.createRun();
        run.setFontFamily("Arial");
        run.setFontSize(size);
        run.setBold(bold);
        run.setText(normalizeText(text));
    }

    private void addDocxImage(XWPFDocument document, ExportImage image) {
        try {
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(image.content()));
            if (bufferedImage == null) {
                return;
            }
            int width = Math.min(420, bufferedImage.getWidth());
            int height = Math.max(1, Math.round((float) bufferedImage.getHeight() * width / bufferedImage.getWidth()));
            height = Math.min(height, 300);

            XWPFParagraph paragraph = document.createParagraph();
            paragraph.setAlignment(ParagraphAlignment.CENTER);
            paragraph.setSpacingAfter(120);
            XWPFRun run = paragraph.createRun();
            run.addPicture(
                    new ByteArrayInputStream(image.content()),
                    image.pictureType(),
                    "imagem-da-questao." + image.extension(),
                    Units.toEMU(width),
                    Units.toEMU(height));
        } catch (IOException | InvalidFormatException ignored) {
            // An invalid external image must not prevent the teacher from downloading the exam.
        }
    }

    private Optional<ExportImage> loadImage(String imageUrl) {
        if (!hasText(imageUrl)) {
            return Optional.empty();
        }

        Matcher dataImage = DATA_IMAGE_PATTERN.matcher(imageUrl);
        if (dataImage.matches()) {
            return createExportImage(dataImage.group(1), Base64.getDecoder().decode(dataImage.group(2)));
        }

        try {
            URI uri = URI.create(imageUrl);
            if (!isSafeRemoteImage(uri)) {
                return Optional.empty();
            }
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(8))
                    .header("Accept", "image/png, image/jpeg")
                    .GET()
                    .build();
            HttpResponse<InputStream> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() != 200) {
                return Optional.empty();
            }
            try (InputStream stream = response.body()) {
                byte[] content = stream.readNBytes(MAX_REMOTE_IMAGE_SIZE + 1);
                if (content.length > MAX_REMOTE_IMAGE_SIZE) {
                    return Optional.empty();
                }
                String contentType = response.headers().firstValue("Content-Type").orElse("");
                return createExportImage(contentType, content);
            }
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private Optional<ExportImage> createExportImage(String contentTypeOrExtension, byte[] content) {
        String value = contentTypeOrExtension.toLowerCase(Locale.ROOT);
        if (value.contains("png")) {
            return Optional.of(new ExportImage(content, "png", Document.PICTURE_TYPE_PNG));
        }
        if (value.contains("jpeg") || value.contains("jpg")) {
            return Optional.of(new ExportImage(content, "jpg", Document.PICTURE_TYPE_JPEG));
        }
        return Optional.empty();
    }

    private boolean isSafeRemoteImage(URI uri) {
        String scheme = uri.getScheme();
        if ((scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) || uri.getHost() == null) {
            return false;
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()
                        || address.isMulticastAddress()) {
                    return false;
                }
            }
            return true;
        } catch (IOException exception) {
            return false;
        }
    }

    private String metadataLine(ExportPayload payload) {
        String teacher = hasText(payload.teacherName()) ? payload.teacherName() : "Professor(a)";
        String classGroup = hasText(payload.exam().classGroup()) ? payload.exam().classGroup() : "Não informada";
        return "Professor(a): %s | Turma: %s | Data: %s".formatted(teacher, classGroup, formatDate(payload.exam().examDate()));
    }

    private String filenameFor(ExportPayload payload, ExamExportFormat format) {
        String base = Normalizer.normalize(payload.exam().title(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);
        String safeBase = base.isBlank() ? "prova" : base;
        return "%s-versao-%s.%s".formatted(safeBase, payload.version().label().toLowerCase(Locale.ROOT), format.extension());
    }

    private String formatDate(LocalDate date) {
        return date == null ? "____/____/________" : DATE_FORMAT.format(date);
    }

    private String formatScore(BigDecimal score) {
        return score == null ? "0" : score.stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private boolean isSingular(BigDecimal score) {
        return score != null && score.compareTo(BigDecimal.ONE) == 0;
    }

    private String letterFor(int position) {
        return String.valueOf((char) ('A' + position - 1));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('\u00A0', ' ')
                .replace('•', '-')
                .replace('–', '-')
                .replace('—', '-')
                .replace('…', '.')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private record ExportPayload(ExamResponse exam, ExamVersionResponse version, String subjectName, String teacherName) {
    }

    private record ExportImage(byte[] content, String extension, int pictureType) {
    }

    private final class PdfPageWriter implements AutoCloseable {

        private static final float MARGIN = 50;
        private static final float BOTTOM = 50;
        private final PDDocument document;
        private final PDFont regular = new PDType1Font(FontName.HELVETICA);
        private final PDFont bold = new PDType1Font(FontName.HELVETICA_BOLD);
        private PDPageContentStream stream;
        private float cursorY;

        private PdfPageWriter(PDDocument document) throws IOException {
            this.document = document;
            newPage();
        }

        private void paragraph(String text, boolean isBold, float fontSize, float leading, float indent, float after) {
            PDFont font = isBold ? bold : regular;
            List<String> lines = wrap(normalizeText(text), font, fontSize, PDRectangle.A4.getWidth() - (MARGIN * 2) - indent);
            for (String line : lines) {
                ensureSpace(leading);
                try {
                    stream.beginText();
                    stream.setFont(font, fontSize);
                    stream.newLineAtOffset(MARGIN + indent, cursorY);
                    stream.showText(line);
                    stream.endText();
                    cursorY -= leading;
                } catch (IOException exception) {
                    throw new IllegalStateException("Não foi possível escrever o PDF da prova.", exception);
                }
            }
            space(after);
        }

        private void image(ExportImage exportImage) {
            try {
                PDImageXObject image = PDImageXObject.createFromByteArray(document, exportImage.content(), "imagem-da-questao");
                float width = Math.min(430, image.getWidth());
                float height = width * image.getHeight() / image.getWidth();
                if (height > 260) {
                    height = 260;
                    width = height * image.getWidth() / image.getHeight();
                }
                ensureSpace(height + 12);
                stream.drawImage(image, MARGIN, cursorY - height, width, height);
                cursorY -= height + 12;
            } catch (IOException ignored) {
                // A problem in one image should never block the whole export.
            }
        }

        private void space(float height) {
            cursorY -= height;
            if (cursorY < BOTTOM) {
                try {
                    newPage();
                } catch (IOException exception) {
                    throw new IllegalStateException("Não foi possível criar outra página do PDF.", exception);
                }
            }
        }

        private void ensureSpace(float requiredHeight) {
            if (cursorY - requiredHeight >= BOTTOM) {
                return;
            }
            try {
                newPage();
            } catch (IOException exception) {
                throw new IllegalStateException("Não foi possível criar outra página do PDF.", exception);
            }
        }

        private void newPage() throws IOException {
            if (stream != null) {
                stream.close();
            }
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            stream = new PDPageContentStream(document, page);
            cursorY = page.getMediaBox().getHeight() - MARGIN;
        }

        @Override
        public void close() throws IOException {
            if (stream != null) {
                stream.close();
                stream = null;
            }
        }

        private List<String> wrap(String text, PDFont font, float fontSize, float maxWidth) {
            java.util.ArrayList<String> lines = new java.util.ArrayList<>();
            StringBuilder current = new StringBuilder();
            for (String word : text.split(" ")) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                try {
                    if (font.getStringWidth(candidate) / 1000 * fontSize <= maxWidth || current.isEmpty()) {
                        current.setLength(0);
                        current.append(candidate);
                    } else {
                        lines.add(current.toString());
                        current.setLength(0);
                        current.append(word);
                    }
                } catch (IOException exception) {
                    throw new IllegalStateException("Não foi possível organizar o texto no PDF.", exception);
                }
            }
            if (!current.isEmpty()) {
                lines.add(current.toString());
            }
            return lines.isEmpty() ? List.of("") : lines;
        }
    }
}
