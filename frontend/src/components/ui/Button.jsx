import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  className = "",
  type = "button",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "min-h-[38px] px-3 py-1.5 text-xs gap-1.5",
    md: "min-h-[44px] px-4 py-2.5 text-sm gap-2",
    lg: "min-h-[52px] px-6 py-3.5 text-base gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.99] shadow-xs",
    secondary:
      "bg-surface-muted text-text hover:bg-border/60 active:scale-[0.99] border border-border",
    outline:
      "bg-transparent text-primary hover:bg-primary-soft border-2 border-primary active:scale-[0.99]",
    ghost:
      "bg-transparent text-text-muted hover:text-text hover:bg-surface-muted active:scale-[0.99]",
    danger:
      "bg-danger text-danger-foreground hover:opacity-90 active:scale-[0.99] shadow-xs",
    accent:
      "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.99] shadow-xs",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}

      <span>{children}</span>

      {!loading && IconRight ? (
        <IconRight className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}
    </button>
  );
}
