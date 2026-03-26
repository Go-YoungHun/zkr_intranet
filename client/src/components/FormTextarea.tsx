import type { TextareaHTMLAttributes } from "react";

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

const FormTextarea = ({ className, hasError, ...props }: FormTextareaProps) => {
  const classes = ["form-textarea", hasError ? "form-textarea--error" : "", className]
    .filter(Boolean)
    .join(" ");

  return <textarea className={classes} {...props} />;
};

export default FormTextarea;
