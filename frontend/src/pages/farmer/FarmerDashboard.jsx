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
        className: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: t.documents.statuses.rejected,
        className: "bg-rose-50 text-rose-800 border-rose-200 font-semibold",
        icon: AlertTriangle,
      };
    default:
      return {
        label: t.documents.statuses.pending,
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock,
      };
  }
}

function getRequestStatusBadge(status, t) {
  switch (status) {
    case "approved":
      return {
        label: t.requestStatuses.approved,
        className: "bg-emerald-100 text-emerald-800",
      };
    case "funded":
      return {
        label: t.requestStatuses.funded,
        className: "bg-teal-100 text-teal-800 font-bold",
      };
    case "rejected":
      return {
        label: t.requestStatuses.rejected,
        className: "bg-rose-100 text-rose-800 font-semibold",
      };
    case "draft":
      return {
        label: t.requestStatuses.draft,
        className: "bg-slate-100 text-slate-700",
      };
    default:
      return {
        label: t.requestStatuses.submitted,
        className: "bg-amber-100 text-amber-800",
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
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-base text-slate-600">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-2xl text-center" role="alert">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
        <p className="text-base font-semibold text-rose-800 mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          type="button"
          className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-xl font-medium min-h-[44px]"
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
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Greeting Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
            {t.dashboard.greeting}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {farmer.name}
          </h1>
          <p className="text-xs text-slate-500">
            {farmer.village ? `${farmer.village}, ${farmer.district}` : farmer.phone}
          </p>
        </div>
        <button
          onClick={() => onNavigateTab("profile")}
          type="button"
          className="p-3 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-full border border-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="View Profile"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Verification Status Banner */}
      <section aria-labelledby="verification-banner-title">
        {isVerified ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-emerald-900">
                {t.verification.verifiedTitle}
              </h2>
              <p className="text-sm text-emerald-800 mt-0.5 leading-relaxed">
                {t.verification.verifiedDesc}
              </p>
            </div>
          </div>
        ) : isRejected ? (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-3.5">
            <ShieldAlert className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-rose-900">
                {t.verification.rejectedTitle}
              </h2>
              <p className="text-sm text-rose-800 mt-0.5 leading-relaxed">
                {farmer.verificationRemarks || t.verification.rejectedDesc}
              </p>
              <button
                onClick={() => onNavigateTab("documents")}
                type="button"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold shadow-sm min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.dashboard.fixRejectedDocs}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5">
            <Clock className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 id="verification-banner-title" className="text-base font-bold text-amber-900">
                {farmer.farmerVerificationStatus === "under_review"
                  ? t.verification.underReviewTitle
                  : t.verification.pendingTitle}
              </h2>
              <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
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
        <section aria-labelledby="doc-chips-heading" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 id="doc-chips-heading" className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>{t.dashboard.documentStatusTitle}</span>
            </h3>
            <button
              onClick={() => onNavigateTab("documents")}
              type="button"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 min-h-[44px]"
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${badge.className}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{typeName}: {badge.label}</span>
                </div>
              );
            })}
          </div>

          {hasRejectedDocument && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => onNavigateTab("documents")}
                type="button"
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{t.dashboard.fixRejectedDocs}</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* 3. Primary CTA: One very large "Request help" button */}
      <section aria-label="Request Assistance Action">
        <div className="bg-linear-to-br from-emerald-50 via-teal-50 to-green-100 p-5 rounded-3xl border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <HandHeart className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-emerald-950">
              {t.dashboard.quickActionTitle}
            </h2>
          </div>

          <button
            onClick={() => onNavigateTab("new-request")}
            disabled={!canRequestHelp}
            type="button"
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-md flex items-center justify-center gap-3 transition-all min-h-[56px] ${
              canRequestHelp
                ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98"
                : "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none border border-slate-300"
            }`}
          >
            <PlusCircle className="w-6 h-6" />
            <span>{t.dashboard.requestHelpButton}</span>
          </button>

          {!canRequestHelp && (
            <div className="mt-3 flex items-start gap-2 text-xs font-medium text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p>{cannotRequestReason || t.dashboard.requestHelpDisabled}</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Active Draft Notice (if farmer has an unfinished draft) */}
      {activeDraft && (
        <section aria-label="Active Draft Reminder">
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-sky-950">
                  {t.dashboard.draftBannerTitle}
                </h3>
                <p className="text-xs text-sky-800 mt-0.5">
                  {activeDraft.category ? `${t.categories[activeDraft.category] || activeDraft.category} • ` : ""}
                  {activeDraft.amountRequested ? `₹${activeDraft.amountRequested.toLocaleString("en-IN")}` : t.dashboard.draftBannerDesc}
                </p>
              </div>
            </div>
            <button
              onClick={() => onResumeDraft ? onResumeDraft(activeDraft) : onNavigateTab("new-request")}
              type="button"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shrink-0 min-h-[44px] flex items-center gap-1 shadow-xs"
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
          <h2 id="recent-requests-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>{t.dashboard.recentTitle}</span>
          </h2>
          {recentRequests && recentRequests.length > 0 && (
            <button
              onClick={() => onNavigateTab("requests")}
              type="button"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 min-h-[44px]"
            >
              <span>{t.dashboard.viewAll}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {!recentRequests || recentRequests.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <HandHeart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-800">
              {t.dashboard.noRequestsYet}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
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
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-colors cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {categoryTitle}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {req.purpose || "Assistance request"}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Funding Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-700">
                        ₹{(req.amountFunded || 0).toLocaleString("en-IN")} {t.dashboard.raisedOf} ₹{(req.amountRequested || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {req.fundingPercentage || 0}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isFunded ? "bg-teal-500" : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.min(100, req.fundingPercentage || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Donor count badge */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {req.donorCount === 1
                          ? t.dashboard.singleDonor
                          : t.dashboard.donorsCount.replace("{count}", req.donorCount || 0)}
                      </span>
                    </div>
                    <div className="text-emerald-700 font-semibold flex items-center gap-0.5">
                      <span>View</span>
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
