package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.provas.dtos.exams.ExamResponse;
import br.com.provas.dtos.versions.AnswerKeyItemResponse;
import br.com.provas.dtos.versions.ExamVersionAlternativeResponse;
import br.com.provas.dtos.versions.ExamVersionQuestionResponse;
import br.com.provas.dtos.versions.ExamVersionResponse;
import br.com.provas.entities.ExamKind;
import br.com.provas.entities.ExamVersionStatus;
import br.com.provas.entities.SubjectEntity;
import br.com.provas.security.UserPrincipal;
import br.com.provas.entities.UserRole;

@ExtendWith(MockitoExtension.class)
class ExamVersionExportServiceTest {

    private static final String ONE_PIXEL_PNG = "data:image/png;base64,"
            + "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUA"
            + "AAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBhXY2BoaPgPAgxgoqHhPwBouwv3MhSPJgAAAABJRU5ErkJggg==";

    @Mock
    private ExamVersionService examVersionService;

    @Mock
    private ExamService examService;

    @Mock
    private SubjectService subjectService;

    private ExamVersionExportService exportService;
    private UserPrincipal teacher;
    private UUID versionId;

    @BeforeEach
    void setUp() {
        exportService = new ExamVersionExportService(examVersionService, examService, subjectService);
        UUID teacherId = UUID.randomUUID();
        UUID examId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        versionId = UUID.randomUUID();
        teacher = new UserPrincipal(teacherId, "Professora Ana", "ana@escola.com", UserRole.TEACHER, 0);

        ExamVersionQuestionResponse question = new ExamVersionQuestionResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                1,
                BigDecimal.ONE,
                "Observe a imagem de apoio e assinale a alternativa correta.",
                ONE_PIXEL_PNG,
                List.of(
                        new ExamVersionAlternativeResponse(UUID.randomUUID(), "Alternativa correta", 1),
                        new ExamVersionAlternativeResponse(UUID.randomUUID(), "Alternativa incorreta", 2)));
        ExamVersionResponse version = new ExamVersionResponse(
                versionId,
                examId,
                "Avaliação de Ciências",
                "A",
                ExamVersionStatus.GENERATED,
                Instant.now(),
                List.of(question),
                List.of(new AnswerKeyItemResponse(1, question.alternatives().getFirst().alternativeId(), "A")));
        ExamResponse exam = new ExamResponse(
                examId,
                subjectId,
                "Avaliação de Ciências",
                "8º Ano",
                null,
                null,
                "Leia as questões com atenção.",
                LocalDate.of(2026, 9, 1),
                new BigDecimal("10.00"),
                1,
                ExamKind.PROVA,
                br.com.provas.entities.ExamStatus.VERSIONS_GENERATED,
                List.of(),
                List.of(),
                Instant.now(),
                Instant.now());

        when(examVersionService.get(eq(teacherId), eq(versionId))).thenReturn(version);
        when(examService.get(eq(teacherId), eq(examId))).thenReturn(exam);
        when(subjectService.findEntity(eq(teacherId), eq(subjectId)))
                .thenReturn(new SubjectEntity(teacherId, "Ciências", null));
    }

    @Test
    void exportsWordDocumentWithQuestionsAndImages() throws Exception {
        ExportedExamDocument result = exportService.export(teacher, versionId, ExamExportFormat.DOCX);

        assertEquals("application/vnd.openxmlformats-officedocument.wordprocessingml.document", result.mediaType());
        assertTrue(result.filename().endsWith(".docx"));
        assertTrue(result.content().length > 0);

        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(result.content()))) {
            assertTrue(document.getParagraphs().stream()
                    .anyMatch(paragraph -> paragraph.getText().contains("Avaliação de Ciências")));
            assertTrue(document.getParagraphs().stream()
                    .anyMatch(paragraph -> paragraph.getText().contains("Alternativa correta")));
            assertEquals(1, document.getAllPictures().size());
        }
    }

    @Test
    void exportsPdfWithQuestionsAndImages() throws Exception {
        ExportedExamDocument result = exportService.export(teacher, versionId, ExamExportFormat.PDF);

        assertEquals("application/pdf", result.mediaType());
        assertTrue(result.filename().endsWith(".pdf"));
        assertTrue(new String(result.content(), 0, 5).startsWith("%PDF-"));

        try (PDDocument document = Loader.loadPDF(result.content())) {
            assertTrue(document.getNumberOfPages() >= 1);
        }
    }
}
