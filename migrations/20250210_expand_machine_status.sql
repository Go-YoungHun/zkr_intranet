ALTER TABLE machines
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active';

UPDATE machines
SET status = CASE
  WHEN status IS NULL OR status = '' THEN CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END
  ELSE status
END;

UPDATE machines
SET is_active = CASE
  WHEN status IN ('active', 'maintenance') THEN 1
  ELSE 0
END;
