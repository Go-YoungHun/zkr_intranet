const EmployeeModule = require("./Employee");
const CustomerModule = require("./Customer");
const CustomerGroupModule = require("./CustomerGroup");
const MachineModule = require("./Machine");
const MachineModelModule = require("./MachineModel");
const MachineAttachmentModule = require("./MachineAttachment");
const CustomerAttachmentModule = require("./CustomerAttachment");
const PartInventoryModule = require("./PartInventory");
const PartInventoryTransactionModule = require("./PartInventoryTransaction");
const TicketCategoryModule = require("./TicketCategory");
const TicketModule = require("./Ticket");
const TicketAttachmentModule = require("./TicketAttachment");
const TicketCommentModule = require("./TicketComment");
const BoardPostModule = require("./BoardPost");
const BoardAttachmentModule = require("./BoardAttachment");
const SalesAgencyModule = require("./SalesAgency");
const LeaveRequestModule = require("./LeaveRequest");
const AuditLogModule = require("./AuditLog");

// ✅ 둘 다 대응: module.exports = Model  또는  module.exports = { Employee: Model }
const Employee = EmployeeModule.Employee || EmployeeModule;
const Customer = CustomerModule.Customer || CustomerModule;
const CustomerGroup = CustomerGroupModule.CustomerGroup || CustomerGroupModule;
const Machine = MachineModule.Machine || MachineModule;
const MachineModel = MachineModelModule.MachineModel || MachineModelModule;
const MachineAttachment = MachineAttachmentModule.MachineAttachment || MachineAttachmentModule;
const CustomerAttachment =
  CustomerAttachmentModule.CustomerAttachment || CustomerAttachmentModule;
const PartInventory = PartInventoryModule.PartInventory || PartInventoryModule;
const PartInventoryTransaction =
  PartInventoryTransactionModule.PartInventoryTransaction ||
  PartInventoryTransactionModule;
const TicketCategory = TicketCategoryModule.TicketCategory || TicketCategoryModule;
const Ticket = TicketModule.Ticket || TicketModule;
const TicketAttachment = TicketAttachmentModule.TicketAttachment || TicketAttachmentModule;
const TicketComment = TicketCommentModule.TicketComment || TicketCommentModule;
const BoardPost = BoardPostModule.BoardPost || BoardPostModule;
const BoardAttachment = BoardAttachmentModule.BoardAttachment || BoardAttachmentModule;
const SalesAgency = SalesAgencyModule.SalesAgency || SalesAgencyModule;
const LeaveRequest = LeaveRequestModule.LeaveRequest || LeaveRequestModule;
const AuditLog = AuditLogModule.AuditLog || AuditLogModule;
// 관계 설정
Customer.hasMany(Machine, { foreignKey: "customer_id" });
Machine.belongsTo(Customer, { foreignKey: "customer_id" });
MachineModel.hasMany(Machine, { foreignKey: "machine_model_id" });
Machine.belongsTo(MachineModel, { foreignKey: "machine_model_id" });
CustomerGroup.hasMany(Customer, { foreignKey: "group_id" });
Customer.belongsTo(CustomerGroup, { foreignKey: "group_id", as: "group" });
SalesAgency.hasMany(Customer, { foreignKey: "sales_agency_id", as: "customers" });
Customer.belongsTo(SalesAgency, { foreignKey: "sales_agency_id", as: "salesAgency" });
TicketCategory.hasMany(Ticket, { foreignKey: "category_id" });
Ticket.belongsTo(TicketCategory, { foreignKey: "category_id" });

Customer.hasMany(Ticket, { foreignKey: "customer_id" });
Ticket.belongsTo(Customer, { foreignKey: "customer_id" });

Machine.hasMany(Ticket, { foreignKey: "machine_id" });
Ticket.belongsTo(Machine, { foreignKey: "machine_id" });

Machine.hasMany(MachineAttachment, { foreignKey: "machine_id" });
MachineAttachment.belongsTo(Machine, { foreignKey: "machine_id" });
Customer.hasMany(CustomerAttachment, { foreignKey: "customer_id" });
CustomerAttachment.belongsTo(Customer, { foreignKey: "customer_id" });

Employee.hasMany(Machine, { foreignKey: "owner_employee_id", as: "OwnedMachines" });
Machine.belongsTo(Employee, { foreignKey: "owner_employee_id", as: "Owner" });

Employee.hasMany(Ticket, { foreignKey: "opened_by_employee_id", as: "openedTickets" });
Employee.hasMany(Ticket, { foreignKey: "assigned_to_employee_id", as: "assignedTickets" });
Ticket.belongsTo(Employee, { foreignKey: "opened_by_employee_id", as: "openedBy" });
Ticket.belongsTo(Employee, { foreignKey: "assigned_to_employee_id", as: "assignedTo" });

Ticket.hasMany(TicketComment, { foreignKey: "ticket_id" });
TicketComment.belongsTo(Ticket, { foreignKey: "ticket_id" });

Employee.hasMany(TicketComment, { foreignKey: "employee_id" });
TicketComment.belongsTo(Employee, { foreignKey: "employee_id" });

Ticket.hasMany(TicketAttachment, { foreignKey: "ticket_id" });
TicketAttachment.belongsTo(Ticket, { foreignKey: "ticket_id" });

Employee.hasMany(BoardPost, { foreignKey: "author_id", as: "boardPosts" });
BoardPost.belongsTo(Employee, { foreignKey: "author_id", as: "author" });
BoardPost.hasMany(BoardAttachment, { foreignKey: "board_post_id", as: "attachments" });
BoardAttachment.belongsTo(BoardPost, { foreignKey: "board_post_id" });

PartInventory.hasMany(PartInventoryTransaction, {
  foreignKey: "inventory_id",
  as: "transactions",
});
PartInventoryTransaction.belongsTo(PartInventory, {
  foreignKey: "inventory_id",
  as: "inventory",
});

Employee.hasMany(PartInventoryTransaction, {
  foreignKey: "created_by_employee_id",
  as: "inventoryTransactions",
});
PartInventoryTransaction.belongsTo(Employee, {
  foreignKey: "created_by_employee_id",
  as: "createdBy",
});

Employee.hasMany(LeaveRequest, { foreignKey: "employee_id", as: "leaveRequests" });
LeaveRequest.belongsTo(Employee, { foreignKey: "employee_id", as: "requester" });
Employee.hasMany(LeaveRequest, {
  foreignKey: "reviewed_by_employee_id",
  as: "reviewedLeaveRequests",
});
LeaveRequest.belongsTo(Employee, {
  foreignKey: "reviewed_by_employee_id",
  as: "reviewer",
});

Employee.hasMany(AuditLog, { foreignKey: "actor_employee_id", as: "auditLogs" });
AuditLog.belongsTo(Employee, { foreignKey: "actor_employee_id", as: "actor" });
Employee.hasMany(AuditLog, {
  foreignKey: "performed_by_employee_id",
  as: "performedAuditLogs",
});
AuditLog.belongsTo(Employee, {
  foreignKey: "performed_by_employee_id",
  as: "performedBy",
});
Employee.hasMany(AuditLog, {
  foreignKey: "on_behalf_of_employee_id",
  as: "delegatedAuditLogs",
});
AuditLog.belongsTo(Employee, {
  foreignKey: "on_behalf_of_employee_id",
  as: "onBehalfOf",
});
module.exports = {
  Employee,
  Customer,
  CustomerGroup,
  Machine,
  MachineModel,
  MachineAttachment,
  CustomerAttachment,
  PartInventory,
  PartInventoryTransaction,
  TicketCategory,
  Ticket,
  TicketAttachment,
  TicketComment,
  BoardPost,
  BoardAttachment,
  SalesAgency,
  LeaveRequest,
  AuditLog,
};
