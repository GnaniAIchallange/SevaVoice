import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

function getDetailStatusBadge(status, t) {
  switch (status) {
    case "approved":
      return {
        label: t.requestStatuses.approved,
        className: "bg-success-soft text-success-soft-text border border-success/30",
        icon: CheckCircle2,
      };
    case "funded":
      return {
        label: t.requestStatuses.funded,
        className: "bg-primary-soft text-primary-soft-text border border-primary/30 font-bold",
        icon: Sparkles,
      };
    case "rejected":
      return {
        label: t.requestStatuses.rejected,
        className: "bg-danger-soft text-danger-soft-text border border-danger/30 font-bold",
        icon: AlertTriangle,
      };
    case "draft":
      return {
        label: t.requestStatuses.draft,
        className: "bg-surface-muted text-text-muted border border-border",
        icon: FileText,
      };
    default:
      return {
        label: t.requestStatuses.submitted,
        className: "bg-warning-soft text-warning-soft-text border border-warning/30",
        icon: Clock,
      };
  }
}

export default function FarmerRequestDetail({
  requestId,
  user,
  onBack,
  onEditDraft,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null);

  // Resubmit modal state for rejected requests
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitCategory, setResubmitCategory] = useState("");
  const [resubmitAmount, setResubmitAmount] = useState("");
  const [resubmitPurpose, setResubmitPurpose] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState(null);

  const lang = user?.preferredLanguage || "en";
  const t = getStrings(lang);

  async function loadDetail() {
    setLoading(true);
    setError(null);
    try {
      const data = await farmerApi.getRequest(requestId);
      setRequest(data.request);
      setResubmitCategory(data.request.category || "");
      setResubmitAmount(data.request.amountRequested || "");
      setResubmitPurpose(data.request.purpose || "");
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (requestId) {
      loadDetail();
    }
  }, [requestId]);

  async function handleResubmit(e) {
    e.preventDefault();
    setResubmitting(true);
    setResubmitError(null);

    try {
      await farmerApi.resubmitRequest(requestId, {
        category: resubmitCategory,
        amountRequested: Number(resubmitAmount),
        purpose: resubmitPurpose,
      });
      setIsResubmitModalOpen(false);
      await loadDetail();
    } catch (err) {
      setResubmitError(err.message || "Failed to resubmit request");
    } finally {
      setResubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]" role="status">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-base text-text-muted">{t.common.loading}</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 m-4 bg-danger-soft border border-danger/30 rounded-2xl text-center" role="alert">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
        <p className="text-base font-semibold text-danger-soft-text mb-4">{error || "Request not found"}</p>
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-border text-text hover:bg-surface-muted rounded-xl font-medium min-h-[44px] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.requests.backToList}</span>
        </button>
      </div>
    );
  }

  const badge = getDetailStatusBadge(request.status, t);
  const StatusIcon = badge.icon;
  const isRejected = request.status === "rejected";
  const isFunded = request.status === "funded" || request.fundingPercentage >= 100;
  const isDraft = request.status === "draft";
  const categoryTitle = t.categories[request.category] || request.category || "Assistance";
  const createdDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          type="button"
          className="p-2.5 text-text-muted hover:text-primary bg-surface hover:bg-surface-muted rounded-2xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
          aria-label={t.requests.backToList}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-serif">
            {t.requests.detailTitle}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {categoryTitle} • {createdDate}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${badge.className}`}>
        <div className="flex items-center gap-2.5">
          <StatusIcon className="w-6 h-6 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {t.requests.statusLabel}
            </p>
            <p className="text-base font-bold text-text">{badge.label}</p>
          </div>
        </div>

        {isDraft && onEditDraft && (
          <button
            onClick={() => onEditDraft(request)}
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Continue Draft</span>
          </button>
        )}
      </div>

      {/* Funded Success Banner */}
      {isFunded && (
        <div className="p-5 bg-primary text-primary-foreground rounded-2xl shadow-sm flex items-center gap-3">
          <Sparkles className="w-8 h-8 shrink-0 text-accent" />
          <div>
            <h2 className="text-base font-bold">
              {t.requests.fundedCongrats}
            </h2>
            <p className="text-xs text-primary-foreground/85 mt-0.5">
              100% of your target amount was contributed by generous donors.
            </p>
          </div>
        </div>
      )}

      {/* Rejection Alert + Prominent Resubmit Action */}
      {isRejected && (
        <div className="p-5 bg-danger-soft border-2 border-danger/40 rounded-2xl">
          <div className="flex items-start gap-2.5 text-danger-soft-text mb-2">
            <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-danger-soft-text">
                {t.requests.rejectionNotesTitle}
              </h2>
              <p className="text-sm text-danger-soft-text mt-1 leading-relaxed bg-surface/80 p-3 rounded-xl border border-danger/20">
                {request.reviewNotes || "Please review the requested amount or details and resubmit."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsResubmitModalOpen(true)}
            type="button"
            className="mt-3 w-full py-3.5 px-4 bg-danger hover:opacity-90 text-danger-foreground font-bold text-sm rounded-xl flex items-center justify-center gap-2 min-h-[48px] shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-5 h-5" />
            <span>{t.requests.resubmitButton}</span>
          </button>
        </div>
      )}

      {/* Financial Target & Funding Progress Card */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              {t.requests.targetAmount}
            </p>
            <p className="text-2xl font-black text-text mt-0.5">
              ₹{(request.amountRequested || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {t.requests.raisedAmount}
            </p>
            <p className="text-2xl font-black text-primary mt-0.5">
              ₹{(request.amountFunded || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-text mb-1.5">
            <span>Funding Progress</span>
            <span className="text-primary font-extrabold">{request.fundingPercentage || 0}%</span>
          </div>
          <div className="w-full bg-surface-muted rounded-full h-3 overflow-hidden border border-border/40">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isFunded ? "bg-accent" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, request.fundingPercentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Anonymous Donor Count */}
        <div className="pt-2 flex items-center gap-2.5 text-xs text-text-muted">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium">
            {request.donorCount && request.donorCount > 0
              ? request.donorCount === 1
                ? t.requests.singleDonorText
                : t.requests.anonymousDonors.replace("{count}", request.donorCount)
              : t.requests.noDonationsYet}
          </span>
        </div>
      </div>

      {/* Request Details Card */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
            Category
          </h2>
          <p className="text-base font-bold text-text">
            {categoryTitle}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
            Purpose & Crop Information
          </h2>
          <p className="text-base text-text leading-relaxed bg-surface-muted p-4 rounded-xl border border-border">
            {request.purpose || "No additional purpose description specified."}
          </p>
        </div>

        {request.transcript && (
          <div>
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">
              Your Spoken Voice Transcript
            </h2>
            <p className="text-xs text-text-muted italic bg-surface-muted p-3.5 rounded-xl border border-border">
              "{request.transcript}"
            </p>
          </div>
        )}
      </div>

      {/* Resubmit Modal Dialog */}
      {isResubmitModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resubmit-modal-title"
        >
          <div className="bg-surface text-text rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 id="resubmit-modal-title" className="text-lg font-bold text-text flex items-center gap-2 font-serif">
                <Edit3 className="w-5 h-5 text-primary" />
                <span>{t.requests.resubmitButton}</span>
              </h2>
              <button
                onClick={() => setIsResubmitModalOpen(false)}
                type="button"
                className="p-2 text-text-muted hover:text-text rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResubmit} className="space-y-4">
              {resubmitError && (
                <div className="p-3 bg-danger-soft border border-danger/30 rounded-xl text-xs text-danger-soft-text flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <span>{resubmitError}</span>
                </div>
              )}

              <div>
                <label htmlFor="resubmit-amount" className="block text-xs font-bold text-text mb-1">
                  Requested Amount (₹)
                </label>
                <input
                  id="resubmit-amount"
                  type="number"
                  min="500"
                  step="100"
                  value={resubmitAmount}
                  onChange={(e) => setResubmitAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[48px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="resubmit-purpose" className="block text-xs font-bold text-text mb-1">
                  Purpose Details
                </label>
                <textarea
                  id="resubmit-purpose"
                  rows={4}
                  value={resubmitPurpose}
                  onChange={(e) => setResubmitPurpose(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-surface-muted border border-border rounded-xl text-text text-base min-h-[96px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(false)}
                  disabled={resubmitting}
                  className="flex-1 py-3 px-4 border border-border text-text-muted font-semibold text-sm rounded-xl min-h-[44px] hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-muted text-primary-foreground font-bold text-sm rounded-xl min-h-[44px] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {resubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
