DROP INDEX IF EXISTS uq_exam_versions_public_token;

ALTER TABLE exam_versions DROP COLUMN IF EXISTS public_token;
