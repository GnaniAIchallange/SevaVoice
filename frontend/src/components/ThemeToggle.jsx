import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();

  // Instant 1-click toggle between Light and Dark
  const handleToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to Light mode" : "Switch to Dark mode";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-border bg-surface text-text hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none ${className}`}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-warning shrink-0 transition-transform duration-200" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-primary shrink-0 transition-transform duration-200" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
