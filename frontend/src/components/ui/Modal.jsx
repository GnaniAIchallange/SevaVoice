import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  isOpen = true,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-2xl",
  className = "",
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-border bg-surface text-text shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in-0 zoom-in-95 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/60 shrink-0">
          <div>
            {title && (
              <h2 id="modal-title" className="text-xl font-bold tracking-tight text-text">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer ml-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
