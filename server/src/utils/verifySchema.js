const { QueryTypes } = require("sequelize");

const REQUIRED_CUSTOMER_COLUMNS = ["legal_name"];

const verifyCustomerNameFields = async (sequelize) => {
  const rows = await sequelize.query(
    `
      SELECT column_name AS columnName
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'customers'
        AND column_name IN (:requiredColumns)
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { requiredColumns: REQUIRED_CUSTOMER_COLUMNS },
    }
  );

  const presentColumns = new Set(
    rows.map((row) => String(row.columnName).toLowerCase())
  );
  const missingColumns = REQUIRED_CUSTOMER_COLUMNS.filter(
    (column) => !presentColumns.has(column)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      [
        "Missing required customers columns:",
        missingColumns.join(", "),
        "Apply migrations/20240918_add_customer_name_fields.sql before starting.",
      ].join(" ")
    );
  }
};

module.exports = {
  verifyCustomerNameFields,
};
