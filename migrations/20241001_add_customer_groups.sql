CREATE TABLE customer_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_groups_name (name)
) ENGINE=InnoDB;

INSERT INTO customer_groups (name, created_at, updated_at)
SELECT DISTINCT name, created_at, updated_at
FROM customers
WHERE legal_name = name
  AND site_name IS NULL
  AND name_en IS NULL
  AND code IS NULL
  AND phone IS NULL
  AND address IS NULL
  AND sales_agent IS NULL;

ALTER TABLE customers
  ADD COLUMN group_id BIGINT UNSIGNED NULL AFTER id;

UPDATE customers AS c
JOIN customer_groups AS g
  ON g.name = c.legal_name
SET c.group_id = g.id;

DELETE FROM customers
WHERE legal_name = name
  AND site_name IS NULL
  AND name_en IS NULL
  AND code IS NULL
  AND phone IS NULL
  AND address IS NULL
  AND sales_agent IS NULL;

ALTER TABLE customers
  ADD KEY idx_customers_group_id (group_id),
  ADD CONSTRAINT fk_customers_group
    FOREIGN KEY (group_id)
    REFERENCES customer_groups (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
