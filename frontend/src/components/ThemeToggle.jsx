import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

const THEME_CYCLE = ["system", "light", "dark"];

export default function ThemeToggle({ className = "" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  const getLabel = () => {
    if (theme === "system") {
      return `Theme: System (${resolvedTheme}). Click to switch to Light mode`;
    }
    if (theme === "light") {
      return "Theme: Light. Click to switch to Dark mode";
    }
    return "Theme: Dark. Click to switch to System mode";
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-border bg-surface text-text hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none ${className}`}
      aria-label={getLabel()}
      title={getLabel()}
    >
      <Icon className="w-5 h-5 shrink-0 transition-transform duration-200" aria-hidden="true" />
      <span className="sr-only">{getLabel()}</span>
    </button>
  );
}
