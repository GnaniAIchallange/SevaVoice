import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Filter,
  PlusCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

function getFilterBadge(status, t) {
  switch (status) {
    case "approved":
      return {
        label: t.requestStatuses.approved,
        className: "bg-success-soft text-success-soft-text border border-success/30",
      };
    case "funded":
      return {
        label: t.requestStatuses.funded,
        className: "bg-primary-soft text-primary-soft-text font-bold border border-primary/30",
      };
    case "rejected":
      return {
        label: t.requestStatuses.rejected,
        className: "bg-danger-soft text-danger-soft-text font-semibold border border-danger/30",
      };
    case "draft":
      return {
        label: t.requestStatuses.draft,
        className: "bg-surface-muted text-text-muted border border-border",
      };
    default:
      return {
        label: t.requestStatuses.submitted,
        className: "bg-warning-soft text-warning-soft-text border border-warning/30",
      };
  }
}

export default function FarmerRequests({
  user,
  onSelectRequest,
  onNewRequest,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const lang = user?.preferredLanguage || "en";
  const t = getStrings(lang);

  async function loadRequests(statusToFilter = selectedFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await farmerApi.getRequests(statusToFilter);
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(selectedFilter);
  }, [selectedFilter]);

  const filterOptions = [
    { key: "all", label: t.requests.filterAll },
    { key: "submitted", label: t.requests.filterSubmitted },
    { key: "approved", label: t.requests.filterApproved },
    { key: "funded", label: t.requests.filterFunded },
    { key: "rejected", label: t.requests.filterRejected },
    { key: "draft", label: t.requests.filterDraft },
  ];

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-serif">
            {t.requests.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Track your requests, funding progress and donor contributions
          </p>
        </div>

        {onNewRequest && (
          <button
            onClick={onNewRequest}
            type="button"
            className="p-2.5 sm:px-4 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs min-h-[44px] cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Request</span>
          </button>
        )}
      </div>

      {/* Filter Tabs (Horizontal scroll on small screens) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter requests">
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selectedFilter === key}
            onClick={() => setSelectedFilter(key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center justify-center transition-colors cursor-pointer border ${
              selectedFilter === key
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface-muted text-text-muted border-border hover:bg-surface hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px]" role="status">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-base text-text-muted">{t.common.loading}</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-danger-soft border border-danger/30 rounded-2xl text-center" role="alert">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
          <p className="text-base font-semibold text-danger-soft-text mb-4">{error}</p>
          <button
            onClick={() => loadRequests(selectedFilter)}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-danger text-danger-foreground rounded-xl font-medium min-h-[44px] cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>{t.common.retry}</span>
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 sm:p-12 bg-surface border border-dashed border-border rounded-2xl text-center">
          <ClipboardList className="w-12 h-12 text-text-muted/60 mx-auto mb-3" />
          <p className="text-base font-bold text-text">
            {t.requests.noFilterResults}
          </p>
          {onNewRequest && (
            <button
              onClick={onNewRequest}
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-sm font-bold min-h-[44px] shadow-xs cursor-pointer transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Request</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const badge = getFilterBadge(req.status, t);
            const categoryTitle = t.categories[req.category] || req.category || "Assistance";
            const isFunded = req.status === "funded" || req.fundingPercentage >= 100;
            const createdDate = req.createdAt
              ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : null;

            return (
              <div
                key={req.id}
                onClick={() => onSelectRequest && onSelectRequest(req.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectRequest && onSelectRequest(req.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className="p-5 bg-surface hover:bg-surface-muted/60 border border-border rounded-2xl shadow-xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-base font-bold text-text">
                      {categoryTitle}
                    </h2>
                    <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                      {req.purpose || "Assistance request"}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-primary font-bold">
                      ₹{(req.amountFunded || 0).toLocaleString("en-IN")} {t.dashboard.raisedOf} ₹{(req.amountRequested || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-text-muted font-bold">
                      {req.fundingPercentage || 0}%
                    </span>
                  </div>

                  <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden border border-border/40">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isFunded ? "bg-accent" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, req.fundingPercentage || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Bottom meta: donor count and date */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    <span>
                      {req.donorCount === 1
                        ? t.dashboard.singleDonor
                        : t.dashboard.donorsCount.replace("{count}", req.donorCount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {createdDate && <span>{createdDate}</span>}
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
