CREATE DATABASE IF NOT EXISTS zkr_intranet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE zkr_intranet;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS part_inventory_transactions;
DROP TABLE IF EXISTS board_attachments;
DROP TABLE IF EXISTS board_posts;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS ticket_categories;
DROP TABLE IF EXISTS customer_attachments;
DROP TABLE IF EXISTS machine_attachments;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS machine_models;
DROP TABLE IF EXISTS part_inventories;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS sales_agencies;
DROP TABLE IF EXISTS customer_groups;
DROP TABLE IF EXISTS employees;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  hire_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  permission_level INT NOT NULL DEFAULT 1,
  department VARCHAR(100) NULL,
  job_title VARCHAR(100) NULL,
  employment_status ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
  contact_phone VARCHAR(50) NULL,
  contact_email VARCHAR(150) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_login_id (login_id)
) ENGINE=InnoDB;

CREATE TABLE customer_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customer_groups_name (name)
) ENGINE=InnoDB;

CREATE TABLE sales_agencies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_agencies_name (name)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  legal_name VARCHAR(120) NULL,
  name_en VARCHAR(120) NULL,
  code VARCHAR(50) NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  sales_agent VARCHAR(120) NULL,
  sales_agency_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_code (code),
  KEY idx_customers_group_id (group_id),
  KEY idx_customers_sales_agency_id (sales_agency_id),
  CONSTRAINT fk_customers_group FOREIGN KEY (group_id)
    REFERENCES customer_groups (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_customers_sales_agency FOREIGN KEY (sales_agency_id)
    REFERENCES sales_agencies (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE machine_models (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_machine_models_name (name)
) ENGINE=InnoDB;

CREATE TABLE machines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  serial_no VARCHAR(80) NULL,
  model VARCHAR(80) NULL,
  software_name VARCHAR(120) NULL,
  machine_model_id BIGINT UNSIGNED NULL,
  software_installed_at DATETIME NULL,
  owner_employee_id BIGINT UNSIGNED NULL,
  location VARCHAR(120) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_machines_serial_no (serial_no),
  KEY idx_machines_customer (customer_id),
  KEY idx_machines_machine_model_id (machine_model_id),
  KEY idx_machines_owner_employee_id (owner_employee_id),
  CONSTRAINT fk_machines_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_machines_machine_model FOREIGN KEY (machine_model_id)
    REFERENCES machine_models (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_machines_owner_employee FOREIGN KEY (owner_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE part_inventories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  serial_no VARCHAR(80) NULL,
  category VARCHAR(80) NOT NULL,
  asset_name VARCHAR(120) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  location VARCHAR(120) NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_part_inventories_serial_no (serial_no)
) ENGINE=InnoDB;

CREATE TABLE ticket_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_categories_name (name)
) ENGINE=InnoDB;

CREATE TABLE board_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NULL,
  author_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_board_posts_board_type (board_type),
  KEY idx_board_posts_author (author_id),
  CONSTRAINT fk_board_posts_author FOREIGN KEY (author_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  machine_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  opened_by_employee_id BIGINT UNSIGNED NOT NULL,
  assigned_to_employee_id BIGINT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(30) NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tickets_customer (customer_id),
  KEY idx_tickets_machine (machine_id),
  KEY idx_tickets_category (category_id),
  KEY idx_tickets_opened_by (opened_by_employee_id),
  KEY idx_tickets_assigned_to (assigned_to_employee_id),
  CONSTRAINT fk_tickets_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_machine FOREIGN KEY (machine_id)
    REFERENCES machines (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_category FOREIGN KEY (category_id)
    REFERENCES ticket_categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_opened_by FOREIGN KEY (opened_by_employee_id)
    REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_tickets_assigned_to FOREIGN KEY (assigned_to_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE machine_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  machine_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NULL,
  file_url VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size BIGINT UNSIGNED NULL,
  uploaded_by_employee_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_machine_attachments_machine (machine_id),
  KEY idx_machine_attachments_uploader (uploaded_by_employee_id),
  CONSTRAINT fk_machine_attachments_machine FOREIGN KEY (machine_id)
    REFERENCES machines (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_machine_attachments_uploader FOREIGN KEY (uploaded_by_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE customer_attachments (
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
  KEY idx_customer_attachments_uploader (uploaded_by_employee_id),
  CONSTRAINT fk_customer_attachments_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_attachments_uploader FOREIGN KEY (uploaded_by_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ticket_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NULL,
  attachment_type ENUM('photo', 'service_report', 'log_file', 'certificate', 'etc') NOT NULL DEFAULT 'etc',
  file_url VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size BIGINT UNSIGNED NULL,
  uploaded_by_employee_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_attachments_ticket (ticket_id),
  KEY idx_ticket_attachments_uploader (uploaded_by_employee_id),
  KEY idx_ticket_attachments_attachment_type (attachment_type),
  CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id)
    REFERENCES tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ticket_attachments_uploader FOREIGN KEY (uploaded_by_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ticket_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NULL,
  comment TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_comments_ticket (ticket_id),
  KEY idx_ticket_comments_employee (employee_id),
  CONSTRAINT fk_ticket_comments_ticket FOREIGN KEY (ticket_id)
    REFERENCES tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ticket_comments_employee FOREIGN KEY (employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE board_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  board_post_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size BIGINT UNSIGNED NULL,
  uploaded_by_employee_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_board_attachments_board_post_id (board_post_id),
  KEY idx_board_attachments_uploader (uploaded_by_employee_id),
  CONSTRAINT fk_board_attachments_board_post FOREIGN KEY (board_post_id)
    REFERENCES board_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_board_attachments_uploader FOREIGN KEY (uploaded_by_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

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

CREATE TABLE leave_requests (
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
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  actor_employee_id BIGINT UNSIGNED NULL,
  performed_by_employee_id BIGINT UNSIGNED NULL,
  on_behalf_of_employee_id BIGINT UNSIGNED NULL,
  changed_fields_json JSON NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_actor_employee (actor_employee_id),
  KEY idx_audit_logs_performed_by_employee (performed_by_employee_id),
  KEY idx_audit_logs_on_behalf_of_employee (on_behalf_of_employee_id),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_actor_employee FOREIGN KEY (actor_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_logs_performed_by_employee FOREIGN KEY (performed_by_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_logs_on_behalf_of_employee FOREIGN KEY (on_behalf_of_employee_id)
    REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
