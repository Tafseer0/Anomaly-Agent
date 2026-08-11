import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, History, Search, Trash2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { clearLog, loadLog, type AlertLogEntry } from "@/lib/alert-log";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Alert History — Anomaly Agent" },
      {
        name: "description",
        content:
          "Search every anomaly email the agent has sent: recipients, timestamps, flagged metrics and delivery status.",
      },
      { property: "og:title", content: "Alert History — Anomaly Agent" },
      {
        property: "og:description",
        content: "Searchable log of past anomaly alerts, recipients, metrics and delivery status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type Filter = "all" | "sent" | "failed";

function HistoryPage() {
  const [entries, setEntries] = useState<AlertLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setEntries(loadLog());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (!q) return true;
      return [
        e.subject,
        e.fileName,
        e.period,
        e.status,
        e.recipients.join(" "),
        e.metrics.join(" "),
        new Date(e.at).toLocaleString(),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [entries, query, filter]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10">
      <Toaster position="top-right" />

      <Link to="/" className="label-mono flex items-center gap-2 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <header className="mt-4">
        <p className="label-mono flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-primary" /> Delivery record
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Alert history</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every anomaly email the agent has attempted, with recipients, flagged metrics and
          delivery status.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search recipient, metric, file, period…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "sent", "failed"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "secondary"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            clearLog();
            setEntries([]);
          }}
          disabled={entries.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      <p className="label-mono mt-4">
        {filtered.length} of {entries.length} alert{entries.length === 1 ? "" : "s"}
      </p>

      <div className="panel mt-3 divide-y divide-border">
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">
            {entries.length === 0
              ? "No alerts sent yet. Run an analysis and send a report to populate this log."
              : "No alerts match that search."}
          </p>
        )}
        {filtered.map((e) => (
          <article key={e.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{e.subject}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString()} · {e.fileName} · period {e.period}
                </p>
              </div>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  e.status === "sent"
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                {e.status === "sent" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {e.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {e.recipients.map((r) => (
                <span
                  key={r}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-[11px]"
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.metrics.length === 0 ? (
                <span className="text-xs text-muted-foreground">No anomalies in this report</span>
              ) : (
                e.metrics.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[11px] text-warning"
                  >
                    {m}
                  </span>
                ))
              )}
            </div>

            {e.error && <p className="mt-2 text-xs text-destructive">{e.error}</p>}
          </article>
        ))}
      </div>
    </main>
  );
}
