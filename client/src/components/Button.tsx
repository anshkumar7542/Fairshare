import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const styles = {
    primary: "bg-ink text-cloud shadow-sm hover:-translate-y-0.5 hover:shadow-lg",
    secondary: "border border-line bg-surface/80 text-ink hover:-translate-y-0.5 hover:bg-elevated",
    ghost: "bg-transparent text-muted hover:bg-elevated hover:text-ink"
  };

  return (
    <button
      className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
