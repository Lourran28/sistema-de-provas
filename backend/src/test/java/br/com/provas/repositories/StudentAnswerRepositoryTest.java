package br.com.provas.repositories;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import br.com.provas.entities.StudentAnswerEntity;
import br.com.provas.entities.StudentAnswerStatus;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:student-answer-replacement;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class StudentAnswerRepositoryTest {

    @Autowired
    private StudentAnswerRepository answers;

    @Test
    void replacesAnswersWithoutViolatingTheQuestionUniqueConstraint() {
        UUID correctionId = UUID.randomUUID();
        UUID versionQuestionId = UUID.randomUUID();
        answers.saveAndFlush(new StudentAnswerEntity(
                correctionId,
                versionQuestionId,
                null,
                null,
                StudentAnswerStatus.NEEDS_REVIEW,
                null,
                null));

        answers.deleteByCorrectionId(correctionId);
        answers.saveAndFlush(new StudentAnswerEntity(
                correctionId,
                versionQuestionId,
                null,
                null,
                StudentAnswerStatus.NEEDS_REVIEW,
                null,
                new BigDecimal("0.01")));

        var persisted = answers.findAllByCorrectionId(correctionId);
        assertEquals(1, persisted.size());
        assertEquals(new BigDecimal("0.01"), persisted.getFirst().getAwardedPoints());
    }
}
