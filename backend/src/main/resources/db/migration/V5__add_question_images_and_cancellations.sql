ALTER TABLE questions ADD COLUMN image_url TEXT;

ALTER TABLE exam_questions ADD COLUMN is_cancelled BOOLEAN NOT NULL DEFAULT false;
