CREATE TABLE exam_applications (
    id UUID PRIMARY KEY,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_group VARCHAR(120) NOT NULL,
    applied_on DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_applications_exam_date ON exam_applications (exam_id, applied_on DESC);

CREATE TABLE exam_application_students (
    id UUID PRIMARY KEY,
    exam_application_id UUID NOT NULL REFERENCES exam_applications(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    student_name VARCHAR(180) NOT NULL,
    student_identifier VARCHAR(80),
    exam_version_id UUID NOT NULL REFERENCES exam_versions(id) ON DELETE RESTRICT,
    version_label VARCHAR(10) NOT NULL,
    attendance VARCHAR(20) NOT NULL,
    CONSTRAINT uq_exam_application_student UNIQUE (exam_application_id, student_id)
);

CREATE INDEX idx_exam_application_students_application ON exam_application_students (exam_application_id);
