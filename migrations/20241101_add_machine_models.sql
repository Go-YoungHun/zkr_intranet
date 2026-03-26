CREATE TABLE machine_models (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_machine_models_name (name)
) ENGINE=InnoDB;

ALTER TABLE machines
  ADD COLUMN machine_model_id BIGINT UNSIGNED NULL AFTER model,
  ADD KEY idx_machines_machine_model_id (machine_model_id),
  ADD CONSTRAINT fk_machines_machine_model
    FOREIGN KEY (machine_model_id)
    REFERENCES machine_models (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
