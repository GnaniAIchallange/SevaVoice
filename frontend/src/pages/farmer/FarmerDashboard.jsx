import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  HandHeart,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

function getDocumentStatusBadge(status, t) {
  switch (status) {
    case "verified":
      return {
        label: t.documents.statuses.verified,
        className: "bg-success-soft text-success-soft-text border-success/30",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: t.documents.statuses.rejected,
        className: "bg-danger-soft text-danger-soft-text border-danger/30 font-semibold",
        icon: AlertTriangle,
      };
    default:
      return {
        label: t.documents.statuses.pending,
        className: "bg-warning-soft text-warning-soft-text border-warning/30",
        icon: Clock,
      };
  }
}

function getRequestStatusBadge(status, t) {
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

export default function FarmerDashboard({
  user,
  onNavigateTab,
  onSelectRequest,
  onResumeDraft,
  onDashboardLoaded,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const lang = data?.farmer?.preferredLanguage || user?.preferredLanguage || "en";
  const t = getStrings(lang);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const result = await farmerApi.getDashboard();
      setData(result);
      if (onDashboardLoaded) {
        onDashboardLoaded(result);
      }
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]" role="status">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-base text-text-muted">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 m-4 bg-danger-soft border border-danger/30 rounded-2xl text-center" role="alert">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
        <p className="text-base font-semibold text-danger-soft-text mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          type="button"
          className="inline-flex items-center gap-2 px-5 py-3 bg-danger text-danger-foreground rounded-xl font-medium min-h-[44px] cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
          <span>{t.common.retry}</span>
        </button>
      </div>
    );
  }

  const { farmer, documents, hasRejectedDocument, canRequestHelp, cannotRequestReason, recentRequests, activeDraft } = data;

  const isVerified = farmer.farmerVerificationStatus === "verified";
  const isRejected = farmer.farmerVerificationStatus === "rejected" || hasRejectedDocument;

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Greeting Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wide">
            {t.dashboard.greeting}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-serif mt-0.5">
            {farmer.name}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {farmer.village ? `${farmer.village}, ${farmer.district}` : farmer.phone}
          </p>
        </div>
        <button
          onClick={() => onNavigateTab("profile")}
          type="button"
          className="p-3 text-text-muted hover:text-primary bg-surface hover:bg-surface-muted rounded-2xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="View Profile"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Verification Status Banner */}
      <section aria-labelledby="verification-banner-title">
        {isVerified ? (
          <div className="p-4 bg-success-soft border border-success/30 rounded-2xl flex items-start gap-3.5">
            <ShieldCheck className="w-7 h-7 text-success shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-success-soft-text">
                {t.verification.verifiedTitle}
              </h2>
              <p className="text-sm text-success-soft-text/90 mt-0.5 leading-relaxed">
                {t.verification.verifiedDesc}
              </p>
            </div>
          </div>
        ) : isRejected ? (
          <div className="p-4 bg-danger-soft border border-danger/30 rounded-2xl flex items-start gap-3.5">
            <ShieldAlert className="w-7 h-7 text-danger shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-danger-soft-text">
                {t.verification.rejectedTitle}
              </h2>
              <p className="text-sm text-danger-soft-text/90 mt-0.5 leading-relaxed">
                {farmer.verificationRemarks || t.verification.rejectedDesc}
              </p>
              <button
                onClick={() => onNavigateTab("documents")}
                type="button"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-danger text-danger-foreground rounded-xl text-sm font-semibold shadow-xs min-h-[44px] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.dashboard.fixRejectedDocs}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-warning-soft border border-warning/30 rounded-2xl flex items-start gap-3.5">
            <Clock className="w-7 h-7 text-warning shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-warning-soft-text">
                {farmer.farmerVerificationStatus === "under_review"
                  ? t.verification.underReviewTitle
                  : t.verification.pendingTitle}
              </h2>
              <p className="text-sm text-warning-soft-text/90 mt-0.5 leading-relaxed">
                {farmer.farmerVerificationStatus === "under_review"
                  ? t.verification.underReviewDesc
                  : t.verification.pendingDesc}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 2. Document Status Chips */}
      {documents && documents.length > 0 && (
        <section aria-labelledby="doc-chips-heading" className="bg-surface p-5 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 id="doc-chips-heading" className="text-sm font-bold text-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>{t.dashboard.documentStatusTitle}</span>
            </h3>
            <button
              onClick={() => onNavigateTab("documents")}
              type="button"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 min-h-[44px] cursor-pointer"
            >
              <span>{t.nav.documents}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => {
              const badge = getDocumentStatusBadge(doc.verificationStatus, t);
              const Icon = badge.icon;
              const typeName = t.documents.docTypes[doc.type] || doc.type;
              return (
                <div
                  key={doc.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge.className}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeName}: {badge.label}</span>
                </div>
              );
            })}
          </div>

          {hasRejectedDocument && (
            <div className="mt-3 pt-3 border-t border-border">
              <button
                onClick={() => onNavigateTab("documents")}
                type="button"
                className="w-full py-2.5 px-4 bg-danger-soft hover:bg-danger-soft/80 text-danger-soft-text border border-danger/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span>{t.dashboard.fixRejectedDocs}</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* 3. Primary CTA: One very large "Request help" button */}
      <section aria-label="Request Assistance Action">
        <div className="bg-surface p-5 sm:p-6 rounded-3xl border-2 border-primary/30 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <HandHeart className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-text">
              {t.dashboard.quickActionTitle}
            </h2>
          </div>

          <button
            onClick={() => onNavigateTab("new-request")}
            disabled={!canRequestHelp}
            type="button"
            className={`w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-md flex items-center justify-center gap-3 transition-all min-h-[58px] ${
              canRequestHelp
                ? "bg-primary hover:bg-primary-hover text-primary-foreground cursor-pointer active:scale-98"
                : "bg-surface-muted text-text-muted cursor-not-allowed shadow-none border border-border opacity-70"
            }`}
          >
            <PlusCircle className="w-6 h-6 shrink-0" />
            <span>{t.dashboard.requestHelpButton}</span>
          </button>

          {!canRequestHelp && (
            <div className="mt-3 flex items-start gap-2 text-xs font-medium text-warning-soft-text bg-warning-soft p-3.5 rounded-xl border border-warning/30">
              <HelpCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p>{cannotRequestReason || t.dashboard.requestHelpDisabled}</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Active Draft Notice (if farmer has an unfinished draft) */}
      {activeDraft && (
        <section aria-label="Active Draft Reminder">
          <div className="p-4 bg-info-soft border border-info/30 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-info shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-info-soft-text">
                  {t.dashboard.draftBannerTitle}
                </h3>
                <p className="text-xs text-info-soft-text/80 mt-0.5">
                  {activeDraft.category ? `${t.categories[activeDraft.category] || activeDraft.category} • ` : ""}
                  {activeDraft.amountRequested ? `₹${activeDraft.amountRequested.toLocaleString("en-IN")}` : t.dashboard.draftBannerDesc}
                </p>
              </div>
            </div>
            <button
              onClick={() => onResumeDraft ? onResumeDraft(activeDraft) : onNavigateTab("new-request")}
              type="button"
              className="px-4 py-2 bg-info text-info-foreground hover:opacity-90 rounded-xl text-xs font-bold shrink-0 min-h-[44px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span>{t.dashboard.continueDraft}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* 5. Recent Requests with Funding Progress Bars */}
      <section aria-labelledby="recent-requests-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-requests-heading" className="text-lg font-bold text-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>{t.dashboard.recentTitle}</span>
          </h2>
          {recentRequests && recentRequests.length > 0 && (
            <button
              onClick={() => onNavigateTab("requests")}
              type="button"
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 min-h-[44px] cursor-pointer"
            >
              <span>{t.dashboard.viewAll}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {!recentRequests || recentRequests.length === 0 ? (
          <div className="p-8 bg-surface border border-dashed border-border rounded-2xl text-center">
            <HandHeart className="w-10 h-10 text-text-muted/60 mx-auto mb-2" />
            <p className="text-base font-semibold text-text">
              {t.dashboard.noRequestsYet}
            </p>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto leading-relaxed">
              {t.dashboard.noRequestsSubtext}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req) => {
              const statusBadge = getRequestStatusBadge(req.status, t);
              const categoryTitle = t.categories[req.category] || req.category || "Assistance";
              const isFunded = req.status === "funded" || req.fundingPercentage >= 100;

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
                  className="p-4 sm:p-5 bg-surface hover:bg-surface-muted/60 border border-border rounded-2xl shadow-xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-text">
                        {categoryTitle}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                        {req.purpose || "Assistance request"}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Funding Progress Bar */}
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

                  {/* Donor count badge */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-text-muted" />
                      <span>
                        {req.donorCount === 1
                          ? t.dashboard.singleDonor
                          : t.dashboard.donorsCount.replace("{count}", req.donorCount || 0)}
                      </span>
                    </div>
                    <div className="text-primary font-bold flex items-center gap-0.5">
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
