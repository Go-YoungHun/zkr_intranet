import type { ReactNode } from "react";

const cardBaseStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
} as const;

const variantStyles = {
  default: {
    padding: 16,
  },
  compact: {
    padding: 12,
    background: "#f9fafb",
    boxShadow: "none",
  },
} as const;

export type MachineSummaryCardProps = {
  title: string;
  model?: string | null;
  customerName?: string | null;
  location?: string | null;
  onClick?: () => void;
  actionSlot?: ReactNode;
  children?: ReactNode;
  variant?: "default" | "compact";
};

const renderValue = (value?: string | null) => {
  if (value === undefined) return null;
  return value?.trim() ? value : "-";
};

export default function MachineSummaryCard({
  title,
  model,
  customerName,
  location,
  onClick,
  actionSlot,
  children,
  variant = "default",
}: MachineSummaryCardProps) {
  const cardVariantStyle = variantStyles[variant];
  const displayModel = renderValue(model);
  const displayCustomer = renderValue(customerName);
  const displayLocation = renderValue(location);

  return (
    <div
      style={{
        ...cardBaseStyle,
        ...cardVariantStyle,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          {displayModel !== null && (
            <div style={{ marginTop: 4, color: "#6b7280" }}>
              모델: {displayModel}
            </div>
          )}
          {displayCustomer !== null && (
            <div style={{ marginTop: 4, color: "#6b7280" }}>
              고객사: {displayCustomer}
            </div>
          )}
          {displayLocation !== null && (
            <div style={{ marginTop: 4, color: "#6b7280" }}>
              위치: {displayLocation}
            </div>
          )}
        </div>

        {actionSlot && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {actionSlot}
          </div>
        )}
      </div>

      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
