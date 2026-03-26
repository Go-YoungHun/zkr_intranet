ALTER TABLE audit_logs
  ADD COLUMN performed_by_employee_id BIGINT UNSIGNED NULL AFTER actor_employee_id,
  ADD COLUMN on_behalf_of_employee_id BIGINT UNSIGNED NULL AFTER performed_by_employee_id,
  ADD KEY idx_audit_logs_performed_by_employee (performed_by_employee_id),
  ADD KEY idx_audit_logs_on_behalf_of_employee (on_behalf_of_employee_id),
  ADD CONSTRAINT fk_audit_logs_performed_by_employee
    FOREIGN KEY (performed_by_employee_id)
    REFERENCES employees (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD CONSTRAINT fk_audit_logs_on_behalf_of_employee
    FOREIGN KEY (on_behalf_of_employee_id)
    REFERENCES employees (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
