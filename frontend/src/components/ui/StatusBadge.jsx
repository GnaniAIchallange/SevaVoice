import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Sparkles,
  XCircle,
} from "lucide-react";

export default function StatusBadge({ status, label, className = "", showIcon = true }) {
  const normalized = String(status || "pending").toLowerCase().trim();

  let config = {
    classes: "bg-warning-soft text-warning-soft-text border-warning/30",
    icon: Clock,
    text: "Pending",
  };

  if (normalized === "verified" || normalized === "approved" || normalized === "active") {
    config = {
      classes: "bg-success-soft text-success-soft-text border-success/30",
      icon: CheckCircle2,
      text: normalized === "verified" ? "Verified" : normalized === "approved" ? "Approved" : "Active",
    };
  } else if (normalized === "funded") {
    config = {
      classes: "bg-primary-soft text-primary-soft-text border-primary/30 font-bold",
      icon: Sparkles,
      text: "Funded",
    };
  } else if (normalized === "rejected" || normalized === "inactive" || normalized === "disabled") {
    config = {
      classes: "bg-danger-soft text-danger-soft-text border-danger/30 font-semibold",
      icon: XCircle,
      text: normalized === "rejected" ? "Rejected" : "Disabled",
    };
  } else if (normalized === "under_review" || normalized === "reviewing") {
    config = {
      classes: "bg-info-soft text-info-soft-text border-info/30",
      icon: Hourglass,
      text: "Under Review",
    };
  } else if (
    normalized.includes("additional") ||
    normalized.includes("info") ||
    normalized === "needs_info"
  ) {
    config = {
      classes: "bg-warning-soft text-warning-soft-text border-warning/30 font-semibold",
      icon: AlertTriangle,
      text: "Needs Information",
    };
  } else if (normalized === "draft") {
    config = {
      classes: "bg-surface-muted text-text-muted border-border",
      icon: FileText,
      text: "Draft",
    };
  } else if (normalized === "closed") {
    config = {
      classes: "bg-surface-muted text-text-muted border-border",
      icon: AlertCircle,
      text: "Closed",
    };
  }

  const IconComponent = config.icon;
  const displayText = label || config.text;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.classes} ${className}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{displayText}</span>
    </span>
  );
}
