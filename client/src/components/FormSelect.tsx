import type { SelectHTMLAttributes } from "react";

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean;
};

const FormSelect = ({ className, hasError, ...props }: FormSelectProps) => {
  const classes = ["form-select", hasError ? "form-select--error" : "", className]
    .filter(Boolean)
    .join(" ");

  return <select className={classes} {...props} />;
};

export default FormSelect;
