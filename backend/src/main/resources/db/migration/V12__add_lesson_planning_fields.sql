ALTER TABLE contents
    ADD COLUMN class_group VARCHAR(120),
    ADD COLUMN planned_date DATE;

CREATE INDEX idx_contents_class_group ON contents (teacher_id, lower(class_group));
CREATE INDEX idx_contents_planned_date ON contents (teacher_id, planned_date);
