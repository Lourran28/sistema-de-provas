CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'TEACHER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role CHECK (role IN ('TEACHER', 'ADMIN'))
);

CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(140) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_subjects_teacher_name ON subjects (teacher_id, lower(name));
CREATE INDEX idx_subjects_teacher ON subjects (teacher_id);

CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    topic VARCHAR(160) NOT NULL,
    theme VARCHAR(160),
    body TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contents_teacher ON contents (teacher_id);
CREATE INDEX idx_contents_subject ON contents (subject_id);
CREATE INDEX idx_contents_topic ON contents (teacher_id, lower(topic));

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    statement TEXT NOT NULL,
    question_type VARCHAR(40) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    difficulty VARCHAR(20) NOT NULL,
    source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_questions_type CHECK (question_type IN ('MULTIPLE_CHOICE', 'DISCURSIVE', 'TRUE_FALSE', 'MULTIPLE_RESPONSE')),
    CONSTRAINT chk_questions_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'MIXED')),
    CONSTRAINT chk_questions_source_type CHECK (source_type IN ('MANUAL', 'AI')),
    CONSTRAINT chk_questions_status CHECK (status IN ('ACTIVE', 'ARCHIVED'))
);

CREATE INDEX idx_questions_teacher ON questions (teacher_id);
CREATE INDEX idx_questions_subject ON questions (subject_id);
CREATE INDEX idx_questions_difficulty ON questions (teacher_id, difficulty);

CREATE TABLE alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_alternatives_position CHECK (position > 0)
);

CREATE UNIQUE INDEX uq_alternatives_question_position ON alternatives (question_id, position);
CREATE INDEX idx_alternatives_question ON alternatives (question_id);

CREATE TABLE question_contents (
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE RESTRICT,
    origin_type VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (question_id, content_id),
    CONSTRAINT chk_question_contents_origin CHECK (origin_type IN ('PRIMARY', 'SUPPORTING'))
);

CREATE INDEX idx_question_contents_content ON question_contents (content_id);

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    class_group VARCHAR(120),
    topic VARCHAR(160),
    description TEXT,
    instructions TEXT,
    exam_date DATE,
    total_value NUMERIC(10,2) NOT NULL DEFAULT 10,
    question_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_exams_total_value CHECK (total_value >= 0),
    CONSTRAINT chk_exams_question_count CHECK (question_count >= 0),
    CONSTRAINT chk_exams_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'READY', 'VERSIONS_GENERATED', 'APPLIED', 'CORRECTED'))
);

CREATE INDEX idx_exams_teacher ON exams (teacher_id);
CREATE INDEX idx_exams_subject ON exams (subject_id);
CREATE INDEX idx_exams_status ON exams (teacher_id, status);

CREATE TABLE exam_contents (
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE RESTRICT,
    question_target_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (exam_id, content_id),
    CONSTRAINT chk_exam_contents_target CHECK (question_target_count IS NULL OR question_target_count >= 0)
);

CREATE INDEX idx_exam_contents_content ON exam_contents (content_id);

CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL,
    points NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_exam_questions_position CHECK (position > 0),
    CONSTRAINT chk_exam_questions_points CHECK (points IS NULL OR points >= 0)
);

CREATE UNIQUE INDEX uq_exam_questions_exam_question ON exam_questions (exam_id, question_id);
CREATE UNIQUE INDEX uq_exam_questions_exam_position ON exam_questions (exam_id, position);
CREATE INDEX idx_exam_questions_question ON exam_questions (question_id);

CREATE TABLE exam_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    label VARCHAR(10) NOT NULL,
    public_token UUID NOT NULL DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL DEFAULT 'GENERATED',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_exam_versions_status CHECK (status IN ('GENERATED', 'PRINTED', 'APPLIED', 'ARCHIVED'))
);

CREATE UNIQUE INDEX uq_exam_versions_exam_label ON exam_versions (exam_id, label);
CREATE UNIQUE INDEX uq_exam_versions_public_token ON exam_versions (public_token);
CREATE INDEX idx_exam_versions_exam ON exam_versions (exam_id);

CREATE TABLE exam_version_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_version_id UUID NOT NULL REFERENCES exam_versions(id) ON DELETE CASCADE,
    exam_question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
    original_question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_exam_version_questions_position CHECK (position > 0)
);

CREATE UNIQUE INDEX uq_exam_version_questions_position ON exam_version_questions (exam_version_id, position);
CREATE UNIQUE INDEX uq_exam_version_questions_exam_question ON exam_version_questions (exam_version_id, exam_question_id);
CREATE INDEX idx_exam_version_questions_question ON exam_version_questions (original_question_id);

CREATE TABLE exam_version_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_version_question_id UUID NOT NULL REFERENCES exam_version_questions(id) ON DELETE CASCADE,
    alternative_id UUID NOT NULL REFERENCES alternatives(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_exam_version_alternatives_position CHECK (position > 0)
);

CREATE UNIQUE INDEX uq_exam_version_alternatives_position ON exam_version_alternatives (exam_version_question_id, position);
CREATE UNIQUE INDEX uq_exam_version_alternatives_alternative ON exam_version_alternatives (exam_version_question_id, alternative_id);
CREATE INDEX idx_exam_version_alternatives_alternative ON exam_version_alternatives (alternative_id);

CREATE TABLE answer_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_version_id UUID NOT NULL REFERENCES exam_versions(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_answer_keys_exam_version ON answer_keys (exam_version_id);

CREATE TABLE answer_key_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_key_id UUID NOT NULL REFERENCES answer_keys(id) ON DELETE CASCADE,
    exam_version_question_id UUID NOT NULL REFERENCES exam_version_questions(id) ON DELETE CASCADE,
    correct_alternative_id UUID NOT NULL REFERENCES alternatives(id) ON DELETE RESTRICT,
    question_position INTEGER NOT NULL,
    correct_letter VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_answer_key_items_position CHECK (question_position > 0)
);

CREATE UNIQUE INDEX uq_answer_key_items_question ON answer_key_items (answer_key_id, exam_version_question_id);
CREATE INDEX idx_answer_key_items_alternative ON answer_key_items (correct_alternative_id);

CREATE TABLE corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_version_id UUID NOT NULL REFERENCES exam_versions(id) ON DELETE RESTRICT,
    student_name VARCHAR(180) NOT NULL,
    student_identifier VARCHAR(80),
    class_group VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_REVIEW',
    score NUMERIC(10,2),
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    blank_count INTEGER NOT NULL DEFAULT 0,
    ambiguous_count INTEGER NOT NULL DEFAULT 0,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_corrections_status CHECK (status IN ('NEEDS_REVIEW', 'CONFIRMED', 'CANCELLED')),
    CONSTRAINT chk_corrections_score CHECK (score IS NULL OR score >= 0)
);

CREATE INDEX idx_corrections_teacher ON corrections (teacher_id);
CREATE INDEX idx_corrections_exam_version ON corrections (exam_version_id);
CREATE INDEX idx_corrections_student ON corrections (teacher_id, student_name);

CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correction_id UUID NOT NULL REFERENCES corrections(id) ON DELETE CASCADE,
    exam_version_question_id UUID NOT NULL REFERENCES exam_version_questions(id) ON DELETE RESTRICT,
    detected_alternative_id UUID REFERENCES alternatives(id) ON DELETE SET NULL,
    final_alternative_id UUID REFERENCES alternatives(id) ON DELETE SET NULL,
    raw_detected_value VARCHAR(80),
    confidence NUMERIC(5,4),
    status VARCHAR(30) NOT NULL DEFAULT 'NEEDS_REVIEW',
    is_correct BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_student_answers_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT chk_student_answers_status CHECK (status IN ('DETECTED', 'BLANK', 'AMBIGUOUS', 'NEEDS_REVIEW', 'CONFIRMED'))
);

CREATE UNIQUE INDEX uq_student_answers_question ON student_answers (correction_id, exam_version_question_id);
CREATE INDEX idx_student_answers_detected_alternative ON student_answers (detected_alternative_id);
CREATE INDEX idx_student_answers_final_alternative ON student_answers (final_alternative_id);

