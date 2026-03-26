ALTER TABLE machines
  ADD COLUMN software_installed_at DATETIME NULL AFTER machine_model_id,
  ADD COLUMN owner_employee_id BIGINT UNSIGNED NULL AFTER software_installed_at,
  ADD KEY idx_machines_owner_employee_id (owner_employee_id),
  ADD CONSTRAINT fk_machines_owner_employee
    FOREIGN KEY (owner_employee_id)
    REFERENCES employees (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
