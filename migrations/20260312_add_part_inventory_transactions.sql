CREATE TABLE part_inventory_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  inventory_id BIGINT UNSIGNED NOT NULL,
  type ENUM('IN', 'OUT', 'ADJUST') NOT NULL,
  quantity_delta INT NOT NULL,
  reason VARCHAR(120) NOT NULL,
  note VARCHAR(255) NULL,
  created_by_employee_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_part_inventory_transactions_inventory_id (inventory_id),
  KEY idx_part_inventory_transactions_created_by (created_by_employee_id),
  KEY idx_part_inventory_transactions_created_at (created_at),
  CONSTRAINT fk_part_inventory_transactions_inventory FOREIGN KEY (inventory_id)
    REFERENCES part_inventories (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_part_inventory_transactions_created_by FOREIGN KEY (created_by_employee_id)
    REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ck_part_inventory_transactions_quantity_delta_non_zero CHECK (quantity_delta <> 0)
) ENGINE=InnoDB;
