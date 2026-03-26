CREATE TABLE IF NOT EXISTS customer_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NULL,
  file_url VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size BIGINT UNSIGNED NULL,
  uploaded_by_employee_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_attachments_customer_id (customer_id),
  CONSTRAINT fk_customer_attachments_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);
