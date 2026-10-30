import { forwardRef } from "react";

export const Input = forwardRef(function Input(
  {
    label,
    id,
    error,
    helperText,
    className = "",
    required,
    type = "text",
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-text"
        >
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-surface text-text placeholder:text-text-muted/60 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-danger focus-visible:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p id={errorId} className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    id,
    error,
    helperText,
    children,
    className = "",
    required,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;
  const helperId = selectId ? `${selectId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-text"
        >
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border bg-surface text-text text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-danger focus-visible:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      >
        {children}
      </select>

      {error ? (
        <p id={errorId} className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  {
    label,
    id,
    error,
    helperText,
    className = "",
    required,
    rows = 3,
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const errorId = textareaId ? `${textareaId}-error` : undefined;
  const helperId = textareaId ? `${textareaId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-semibold text-text"
        >
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`w-full min-h-[88px] px-3.5 py-2.5 rounded-xl border bg-surface text-text placeholder:text-text-muted/60 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-danger focus-visible:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p id={errorId} className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
