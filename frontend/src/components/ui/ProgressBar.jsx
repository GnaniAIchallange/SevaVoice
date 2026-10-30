export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  showPercentage = false,
  className = "",
  variant = "primary",
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((Number(value) / (Number(max) || 1)) * 100)));

  const variantFills = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-text">
          {label && <span>{label}</span>}
          {showPercentage && <span className="text-text-muted">{percentage}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
        className="w-full h-2.5 rounded-full bg-surface-muted border border-border/40 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            variantFills[variant] || variantFills.primary
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
