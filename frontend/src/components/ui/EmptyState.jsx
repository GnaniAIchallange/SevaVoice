import { Inbox } from "lucide-react";
import Button from "./Button.jsx";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface text-text ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-primary mb-3">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-text tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-muted max-w-md mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction} variant="primary" size="md">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
