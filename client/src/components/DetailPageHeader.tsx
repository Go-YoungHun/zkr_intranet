import type { ReactNode } from "react";

type DetailPageHeaderProps = {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

const DetailPageHeader = ({ title, meta, actions }: DetailPageHeaderProps) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        paddingBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {title}
        {meta}
      </div>
      {actions ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export default DetailPageHeader;
