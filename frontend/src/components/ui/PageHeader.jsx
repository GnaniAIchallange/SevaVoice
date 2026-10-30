export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <header className={`space-y-2 mb-6 sm:mb-8 ${className}`}>
      {eyebrow && (
        <p className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-text font-serif">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-text-muted mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
