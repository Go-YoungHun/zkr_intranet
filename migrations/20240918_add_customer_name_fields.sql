ALTER TABLE customers
  ADD COLUMN legal_name VARCHAR(120) NULL AFTER name,
  ADD COLUMN site_name VARCHAR(120) NULL AFTER legal_name;

UPDATE customers
SET legal_name = name
WHERE legal_name IS NULL;

UPDATE customers c
JOIN customers p ON c.parent_id = p.id
SET c.legal_name = p.legal_name
WHERE c.parent_id IS NOT NULL;

UPDATE customers
SET site_name = name
WHERE site_name IS NULL AND parent_id IS NOT NULL;
