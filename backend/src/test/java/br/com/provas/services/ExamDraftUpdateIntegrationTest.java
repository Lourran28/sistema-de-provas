package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import br.com.provas.dtos.exams.ExamRequest;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionEntity;
import br.com.provas.entities.QuestionType;
import br.com.provas.repositories.ExamQuestionRepository;
import br.com.provas.repositories.QuestionRepository;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:exam-draft-update;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.jwt.secret=isolated-integration-test-secret-at-least-32-characters",
        "app.frontend-url=https://provas.example.test", "app.mail.from=provas@example.test"
})
class ExamDraftUpdateIntegrationTest {

    @Autowired private ExamService exams;
    @Autowired private QuestionRepository questions;
    @Autowired private ExamQuestionRepository examQuestions;
    @MockitoBean private JavaMailSender mailSender;

    @Test
    void replacesExistingQuestionOrderWithoutViolatingUniqueConstraints() {
        UUID teacherId = UUID.randomUUID();
        QuestionEntity first = questions.save(new QuestionEntity(
                teacherId, null, "Primeira questao", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM));
        QuestionEntity second = questions.save(new QuestionEntity(
                teacherId, null, "Segunda questao", QuestionType.MULTIPLE_CHOICE, QuestionDifficulty.MEDIUM));

        var created = exams.create(teacherId, request("Avaliacao inicial", List.of(first.getId(), second.getId())));
        var updated = exams.updateDraft(
                teacherId,
                created.id(),
                request("Avaliacao revisada", List.of(second.getId(), first.getId())));

        assertEquals("Avaliacao revisada", updated.title());
        assertEquals(List.of(second.getId(), first.getId()),
                updated.questions().stream().map(question -> question.questionId()).toList());
        assertEquals(List.of(1, 2),
                examQuestions.findAllByExamIdOrderByPositionAsc(created.id()).stream()
                        .map(question -> question.getPosition())
                        .toList());
    }

    private ExamRequest request(String title, List<UUID> questionIds) {
        return new ExamRequest(
                null,
                title,
                "8 A",
                null,
                null,
                null,
                null,
                new BigDecimal("10.00"),
                questionIds);
    }
}
