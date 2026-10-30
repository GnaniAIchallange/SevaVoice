export function Table({ children, className = "" }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
      <table className={`w-full text-left text-sm border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = "" }) {
  return (
    <thead className={`border-b border-border bg-surface-muted/60 text-xs font-bold text-text-muted uppercase tracking-wider ${className}`}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className = "" }) {
  return (
    <tr className={`border-b border-border/60 hover:bg-surface-muted/30 transition-colors last:border-b-0 ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = "" }) {
  return (
    <th scope="col" className={`px-4 py-3 sm:px-6 sm:py-3.5 font-bold ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "" }) {
  return (
    <td className={`px-4 py-3.5 sm:px-6 sm:py-4 align-middle text-text ${className}`}>
      {children}
    </td>
  );
}
