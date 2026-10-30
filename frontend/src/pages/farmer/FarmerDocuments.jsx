import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import { farmerApi } from "./farmerApi.js";
import { getStrings } from "./farmerStrings.js";

function getDocBadge(status, t) {
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
        className: "bg-danger-soft text-danger-soft-text border-danger/30 font-bold",
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

export default function FarmerDocuments({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocForReupload, setSelectedDocForReupload] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const lang = user?.preferredLanguage || "en";
  const t = getStrings(lang);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const data = await farmerApi.getDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) {
      setUploadFile(null);
      return;
    }

    // Max 8 MB
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("File is too large. Please select a document smaller than 8 MB.");
      setUploadFile(null);
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      setUploadError("Invalid file type. Please use a PDF, JPG, JPEG, or PNG file.");
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
  }

  async function handleReuploadSubmit(e) {
    e.preventDefault();
    if (!selectedDocForReupload || !uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await farmerApi.reuploadDocument(selectedDocForReupload.id, uploadFile);
      setUploadSuccess(t.documents.successUpload);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Refresh documents
      await loadDocuments();
      setTimeout(() => {
        setSelectedDocForReupload(null);
        setUploadSuccess(null);
      }, 1500);
    } catch (err) {
      setUploadError(err.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto px-4 pt-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        {onBack && (
          <button
            onClick={onBack}
            type="button"
            className="p-2.5 text-text-muted hover:text-primary bg-surface hover:bg-surface-muted rounded-2xl border border-border min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-serif">
            {t.documents.pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            {t.documents.subtitle}
          </p>
        </div>
      </div>

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
            onClick={loadDocuments}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-danger text-danger-foreground rounded-xl font-medium min-h-[44px] cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
            <span>{t.common.retry}</span>
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 sm:p-12 bg-surface border border-dashed border-border rounded-2xl text-center">
          <FileText className="w-12 h-12 text-text-muted/60 mx-auto mb-3" />
          <p className="text-base font-bold text-text">{t.documents.noDocs}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const badge = getDocBadge(doc.verificationStatus, t);
            const Icon = badge.icon;
            const docName = t.documents.docTypes[doc.type] || doc.type;
            const isRejected = doc.verificationStatus === "rejected";
            const uploadDate = doc.createdAt
              ? new Date(doc.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={doc.id}
                className={`p-5 rounded-2xl border bg-surface shadow-xs transition-all ${
                  isRejected ? "border-danger/40 ring-1 ring-danger/20" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isRejected ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text">
                        {docName}
                      </h2>
                      <p className="text-xs text-text-muted mt-0.5">
                        {uploadDate ? `Uploaded: ${uploadDate}` : ""}
                        {doc.size ? ` • ${(doc.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0 ${badge.className}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Rejection notice and reason */}
                {isRejected && (
                  <div className="mt-4 p-4 bg-danger-soft border border-danger/30 rounded-xl">
                    <div className="flex items-start gap-2 text-danger-soft-text text-xs">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">{t.documents.rejectionReasonPrefix} </span>
                        <span>{doc.rejectionReason || "Document could not be verified. Please upload a clear original copy."}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDocForReupload(doc);
                        setUploadFile(null);
                        setUploadError(null);
                        setUploadSuccess(null);
                      }}
                      type="button"
                      className="mt-3 w-full py-2.5 px-4 bg-danger hover:opacity-90 text-danger-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] shadow-xs transition-opacity cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{t.documents.reuploadBtn}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Re-upload Modal Dialog */}
      {selectedDocForReupload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-surface text-text rounded-3xl p-6 w-full max-w-md shadow-2xl border border-border max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 id="modal-title" className="text-lg font-bold text-text flex items-center gap-2 font-serif">
                <UploadCloud className="w-5 h-5 text-primary" />
                <span>{t.documents.reuploadBtn}</span>
              </h2>
              <button
                onClick={() => setSelectedDocForReupload(null)}
                type="button"
                className="p-2 text-text-muted hover:text-text rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-1">
              Replacing: <strong className="text-text">{t.documents.docTypes[selectedDocForReupload.type] || selectedDocForReupload.type}</strong>
            </p>
            <p className="text-xs text-text-muted mb-4">
              {t.documents.uploadNewFilePrompt}
            </p>

            <form onSubmit={handleReuploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-5 text-center bg-surface-muted transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="reupload-file-input"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                />
                <label
                  htmlFor="reupload-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center min-h-[64px]"
                >
                  <UploadCloud className="w-10 h-10 text-primary mb-2" />
                  <span className="text-sm font-bold text-primary">
                    {uploadFile ? uploadFile.name : t.documents.chooseFile}
                  </span>
                  <span className="text-xs text-text-muted mt-1">
                    {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : "PDF, JPG, or PNG (Max 8 MB)"}
                  </span>
                </label>
              </div>

              {uploadError && (
                <div className="p-3 bg-danger-soft border border-danger/30 rounded-xl text-xs text-danger-soft-text flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-success-soft border border-success/30 rounded-xl text-xs text-success-soft-text flex items-start gap-2" role="alert">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocForReupload(null)}
                  disabled={uploading}
                  className="flex-1 py-3 px-4 border border-border text-text-muted font-semibold text-sm rounded-xl min-h-[44px] hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-text-muted text-primary-foreground font-bold text-sm rounded-xl min-h-[44px] flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t.documents.uploading}</span>
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
