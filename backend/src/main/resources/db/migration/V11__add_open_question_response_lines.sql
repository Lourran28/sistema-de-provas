ALTER TABLE questions
    ADD COLUMN response_lines INTEGER NOT NULL DEFAULT 5;

ALTER TABLE questions
    ADD CONSTRAINT chk_questions_response_lines
    CHECK (response_lines BETWEEN 1 AND 30);

ALTER TABLE exam_version_questions
    ADD COLUMN response_lines INTEGER NOT NULL DEFAULT 5;

ALTER TABLE exam_version_questions
    ADD CONSTRAINT chk_exam_version_questions_response_lines
    CHECK (response_lines BETWEEN 1 AND 30);
