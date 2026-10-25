import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Edit3,
  FileText,
  HandHeart,
  HelpCircle,
  RefreshCw,
  Send,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
  Wheat,
  X,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

function getDetailStatusBadge(status, t) {
  switch (status) {
    case "approved":
      return {
        label: t.requestStatuses.approved,
        className: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: CheckCircle2,
      };
    case "funded":
      return {
        label: t.requestStatuses.funded,
        className: "bg-teal-100 text-teal-800 border-teal-300 font-bold",
        icon: Sparkles,
      };
    case "rejected":
      return {
        label: t.requestStatuses.rejected,
        className: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
        icon: AlertTriangle,
      };
    case "draft":
      return {
        label: t.requestStatuses.draft,
        className: "bg-slate-100 text-slate-700 border-slate-300",
        icon: FileText,
      };
    default:
      return {
        label: t.requestStatuses.submitted,
        className: "bg-amber-100 text-amber-800 border-amber-300",
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
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-base text-slate-600">{t.common.loading}</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-2xl text-center" role="alert">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
        <p className="text-base font-semibold text-rose-800 mb-4">{error || "Request not found"}</p>
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium min-h-[44px]"
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
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-2">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <button
          onClick={onBack}
          type="button"
          className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-full border border-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label={t.requests.backToList}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.requests.detailTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {categoryTitle} • {createdDate}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${badge.className}`}>
        <div className="flex items-center gap-2.5">
          <StatusIcon className="w-6 h-6 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {t.requests.statusLabel}
            </p>
            <p className="text-base font-bold text-slate-900">{badge.label}</p>
          </div>
        </div>

        {isDraft && onEditDraft && (
          <button
            onClick={() => onEditDraft(request)}
            type="button"
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold min-h-[44px] flex items-center gap-1.5 shadow-xs"
          >
            <Edit3 className="w-4 h-4" />
            <span>Continue Draft</span>
          </button>
        )}
      </div>

      {/* Funded Success Banner */}
      {isFunded && (
        <div className="p-5 bg-linear-to-r from-teal-500 to-emerald-600 text-white rounded-2xl shadow-sm flex items-center gap-3">
          <Sparkles className="w-8 h-8 shrink-0 text-amber-300" />
          <div>
            <h2 className="text-base font-bold">
              {t.requests.fundedCongrats}
            </h2>
            <p className="text-xs text-teal-100 mt-0.5">
              100% of your target amount was contributed by generous donors.
            </p>
          </div>
        </div>
      )}

      {/* Rejection Alert + Prominent Resubmit Action */}
      {isRejected && (
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl">
          <div className="flex items-start gap-2.5 text-rose-900 mb-2">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-rose-950">
                {t.requests.rejectionNotesTitle}
              </h2>
              <p className="text-sm text-rose-800 mt-1 leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200">
                {request.reviewNotes || "Please review the requested amount or details and resubmit."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsResubmitModalOpen(true)}
            type="button"
            className="mt-3 w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 min-h-[48px] shadow-sm transition-colors cursor-pointer"
          >
            <Edit3 className="w-5 h-5" />
            <span>{t.requests.resubmitButton}</span>
          </button>
        </div>
      )}

      {/* Financial Target & Funding Progress Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.requests.targetAmount}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              ₹{(request.amountRequested || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              {t.requests.raisedAmount}
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              ₹{(request.amountFunded || 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Funding Progress</span>
            <span className="text-emerald-700 font-extrabold">{request.fundingPercentage || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isFunded ? "bg-teal-500" : "bg-emerald-600"
              }`}
              style={{ width: `${Math.min(100, request.fundingPercentage || 0)}%` }}
            />
          </div>
        </div>

        {/* Anonymous Donor Count: STRICTLY anonymous count, NO donor names */}
        <div className="pt-2 flex items-center gap-2.5 text-xs text-slate-600">
          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Category
          </h2>
          <p className="text-base font-bold text-slate-900">
            {categoryTitle}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Purpose & Crop Information
          </h2>
          <p className="text-base text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {request.purpose || "No additional purpose description specified."}
          </p>
        </div>

        {request.transcript && (
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Your Spoken Voice Transcript
            </h2>
            <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
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
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 id="resubmit-modal-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <span>{t.requests.resubmitButton}</span>
              </h2>
              <button
                onClick={() => setIsResubmitModalOpen(false)}
                type="button"
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResubmit} className="space-y-4">
              {resubmitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{resubmitError}</span>
                </div>
              )}

              <div>
                <label htmlFor="resubmit-amount" className="block text-xs font-bold text-slate-600 mb-1">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base min-h-[48px] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="resubmit-purpose" className="block text-xs font-bold text-slate-600 mb-1">
                  Purpose Details
                </label>
                <textarea
                  id="resubmit-purpose"
                  rows={4}
                  value={resubmitPurpose}
                  onChange={(e) => setResubmitPurpose(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base min-h-[96px] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(false)}
                  disabled={resubmitting}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmitting}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl min-h-[44px] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
