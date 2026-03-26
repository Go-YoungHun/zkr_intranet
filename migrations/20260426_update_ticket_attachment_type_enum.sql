UPDATE ticket_attachments
SET attachment_type = "service_report"
WHERE attachment_type = "report";

ALTER TABLE ticket_attachments
  MODIFY COLUMN attachment_type ENUM("photo", "service_report", "log_file", "certificate", "etc")
  NOT NULL
  DEFAULT "etc";
