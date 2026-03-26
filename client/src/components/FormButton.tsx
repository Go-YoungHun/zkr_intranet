import type { ButtonHTMLAttributes } from "react";

type FormButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const FormButton = ({ className, variant = "primary", ...props }: FormButtonProps) => {
  const classes = [
    "form-button",
    variant === "secondary" ? "form-button--secondary" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
};

export default FormButton;
