ALTER TABLE exam_version_questions
    ADD COLUMN question_type VARCHAR(40);

UPDATE exam_version_questions
SET question_type = (
    SELECT questions.question_type
    FROM questions
    WHERE questions.id = exam_version_questions.original_question_id
);

ALTER TABLE exam_version_questions
    ALTER COLUMN question_type SET NOT NULL;

ALTER TABLE exam_version_questions
    ADD CONSTRAINT chk_exam_version_questions_type
    CHECK (question_type IN ('MULTIPLE_CHOICE', 'DISCURSIVE', 'TRUE_FALSE', 'MULTIPLE_RESPONSE'));

ALTER TABLE student_answers
    ADD COLUMN awarded_points NUMERIC(10,2);

ALTER TABLE student_answers
    ADD CONSTRAINT chk_student_answers_awarded_points
    CHECK (awarded_points IS NULL OR awarded_points >= 0);
