CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_unit ENUM('full', 'half_am', 'half_pm') NOT NULL DEFAULT 'full',
  duration_days DECIMAL(4,1) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by_employee_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_comment VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_requests_employee_id (employee_id),
  KEY idx_leave_requests_status (status),
  KEY idx_leave_requests_reviewer (reviewed_by_employee_id),
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id)
    REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_leave_requests_reviewer FOREIGN KEY (reviewed_by_employee_id)
    REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
