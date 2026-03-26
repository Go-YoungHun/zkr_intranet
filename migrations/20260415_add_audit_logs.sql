CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  actor_employee_id BIGINT UNSIGNED NULL,
  changed_fields_json JSON NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_actor_employee (actor_employee_id),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_actor_employee
    FOREIGN KEY (actor_employee_id)
    REFERENCES employees (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);
