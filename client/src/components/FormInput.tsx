import type { InputHTMLAttributes } from "react";

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

const FormInput = ({ className, hasError, ...props }: FormInputProps) => {
  const classes = ["form-control", hasError ? "form-control--error" : "", className]
    .filter(Boolean)
    .join(" ");

  return <input className={classes} {...props} />;
};

export default FormInput;
