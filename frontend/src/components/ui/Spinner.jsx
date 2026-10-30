import { Loader2 } from "lucide-react";

export function Spinner({ size = "md", className = "", label = "Loading..." }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div
      role="status"
      className={`inline-flex items-center justify-center gap-2 text-primary ${className}`}
    >
      <Loader2
        className={`animate-spin ${sizeClasses[size] || sizeClasses.md}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-muted/80 ${className}`}
      aria-hidden="true"
    />
  );
}
