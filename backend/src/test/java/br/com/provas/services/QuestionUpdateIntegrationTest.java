package br.com.provas.services;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import br.com.provas.dtos.questions.AlternativeRequest;
import br.com.provas.dtos.questions.QuestionRequest;
import br.com.provas.entities.QuestionDifficulty;
import br.com.provas.entities.QuestionType;
import br.com.provas.entities.SubjectEntity;
import br.com.provas.repositories.SubjectRepository;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:question-update;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.security.jwt.secret=isolated-integration-test-secret-at-least-32-characters",
        "app.frontend-url=https://provas.example.test", "app.mail.from=provas@example.test"
})
class QuestionUpdateIntegrationTest {

    @Autowired private QuestionService questions;
    @Autowired private SubjectRepository subjects;
    @MockitoBean private JavaMailSender mailSender;

    @Test
    void replacesAlternativesWithoutConflictingWithTheirExistingPositions() {
        UUID teacherId = UUID.randomUUID();
        SubjectEntity portuguese = subjects.saveAndFlush(new SubjectEntity(teacherId, "Português", null));
        var created = questions.create(teacherId, request(portuguese.getId(), "Questão original", "Certa", "Errada"));

        var updated = questions.update(
                teacherId,
                created.id(),
                request(portuguese.getId(), "Questão atualizada", "Nova certa", "Nova errada"));

        assertEquals(created.id(), updated.id());
        assertEquals("Questão atualizada", updated.statement());
        assertEquals(List.of("Nova certa", "Nova errada"),
                updated.alternatives().stream().map(alternative -> alternative.text()).toList());
        assertEquals(List.of(1, 2),
                updated.alternatives().stream().map(alternative -> alternative.position()).toList());
    }

    private QuestionRequest request(UUID subjectId, String statement, String firstAlternative, String secondAlternative) {
        return new QuestionRequest(
                subjectId,
                null,
                statement,
                null,
                QuestionType.MULTIPLE_CHOICE,
                QuestionDifficulty.MEDIUM,
                List.of(new AlternativeRequest(firstAlternative), new AlternativeRequest(secondAlternative)),
                0);
    }
}
