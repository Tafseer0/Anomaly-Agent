import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ChevronDown,
  Download,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Moon,
  Radar,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/history", label: "History", icon: History },
];

function ThemeSlider() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode slider"
      title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
      className="relative flex h-8 w-14 items-center rounded-full border border-border bg-muted p-1 transition-colors hover:border-primary/40 focus-visible:outline-none"
    >
      <div className="flex w-full items-center justify-between px-1">
        <Sun className="h-3 w-3 text-amber-500" />
        <Moon className="h-3 w-3 text-indigo-400" />
      </div>
      <div
        className={cn(
          "absolute left-1 flex h-6 w-6 items-center justify-center rounded-full shadow-md ring-1 ring-border transition-transform duration-300",
          theme === "dark"
            ? "translate-x-6 bg-slate-900 text-indigo-300 ring-indigo-500/40"
            : "translate-x-0 bg-amber-100 text-amber-600 ring-amber-400/40",
        )}
      >
        {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </div>
    </button>
  );
}

export function Navbar() {
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 shadow-[0_8px_24px_-20px_var(--color-primary)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link
          to="/"
          className="group flex items-center gap-2 transition-transform hover:scale-[1.02]"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 shadow-[0_0_16px_-4px_var(--color-primary)] transition-all group-hover:bg-primary/20 group-hover:shadow-[0_0_22px_-4px_var(--color-primary)]">
            <Radar className="h-4 w-4 text-primary transition-transform duration-500 group-hover:rotate-90" />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-sm font-bold leading-tight">AI Anomaly Agent</p>
            <p className="label-mono text-[10px] leading-none">AI metric watcher</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5",
                isActive(item.to)
                  ? "bg-primary/15 text-primary shadow-[0_6px_18px_-14px_var(--color-primary)]"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">{item.label}</span>
              <span
                className={cn(
                  "absolute bottom-0.5 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-primary transition-all",
                  isActive(item.to) ? "w-6" : "w-0 group-hover:w-4",
                )}
              />
            </Link>
          ))}

          {/* Light / Dark Mode Slider */}
          <ThemeSlider />

          <div className="relative ml-1">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Sample data</span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
              />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md">
                  <a
                    href="/sample-business-data.xlsx"
                    download
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Download .xlsx
                  </a>
                  <a
                    href="/sample-business-data.csv"
                    download
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Download .csv
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

