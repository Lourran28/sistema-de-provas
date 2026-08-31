CREATE TABLE students (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    identifier VARCHAR(80),
    class_group VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_teacher_class ON students (teacher_id, class_group);
CREATE UNIQUE INDEX uq_students_teacher_identifier ON students (teacher_id, identifier);

ALTER TABLE corrections ADD COLUMN student_id UUID;
ALTER TABLE corrections ADD CONSTRAINT fk_corrections_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX idx_corrections_student_id ON corrections (student_id);
