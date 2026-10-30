import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export default function Alert({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
}) {
  const configs = {
    info: {
      container: "bg-info-soft border-info/30 text-info-soft-text",
      icon: Info,
    },
    success: {
      container: "bg-success-soft border-success/30 text-success-soft-text",
      icon: CheckCircle2,
    },
    warning: {
      container: "bg-warning-soft border-warning/30 text-warning-soft-text",
      icon: AlertTriangle,
    },
    danger: {
      container: "bg-danger-soft border-danger/30 text-danger-soft-text",
      icon: AlertCircle,
    },
  };

  const current = configs[variant] || configs.info;
  const IconComponent = current.icon;

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${current.container} ${className}`}
    >
      <IconComponent className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm leading-relaxed">
        {title && <h4 className="font-bold mb-0.5">{title}</h4>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
