import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Download,
  FileSpreadsheet,
  Gauge,
  History,
  Info,
  Radar,
  Ruler,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MetricCard } from "@/components/anomaly/MetricCard";
import { ReportPanel } from "@/components/anomaly/ReportPanel";
import { ThresholdSettings } from "@/components/anomaly/ThresholdSettings";
import { analyze, type Dataset, type MetricSetting } from "@/lib/anomaly";
import { parseWorkbook, sampleDataset } from "@/lib/excel";
import { appendLog, loadLog, type AlertLogEntry } from "@/lib/alert-log";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anomaly Watcher Agent" },
      {
        name: "description",
        content:
          "Upload an Excel or CSV sheet to detect metric anomalies, get plain-English summaries, and email alerts to chosen recipients.",
      },
      { property: "og:title", content: "Anomaly Agent — Excel & CSV Metric Watcher" },
      {
        property: "og:description",
        content:
          "Detect anomalies in daily business metrics, tune thresholds per metric, and send automated email alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const RECIPIENTS_KEY = "anomaly-agent-recipients";

function Index() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [windowSize, setWindowSize] = useState(7);
  const [threshold, setThreshold] = useState(2);
  const [perMetric, setPerMetric] = useState<Record<string, MetricSetting>>({});
  const [recipients, setRecipients] = useState<string[]>([]);
  const [log, setLog] = useState<AlertLogEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLog(loadLog());
    try {
      const raw = localStorage.getItem(RECIPIENTS_KEY);
      if (raw) setRecipients(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const updateRecipients = useCallback((next: string[]) => {
    setRecipients(next);
    try {
      localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addLog = useCallback((entry: AlertLogEntry) => {
    setLog(appendLog(entry));
  }, []);

  const handleFile = useCallback(async (file: File) => {
    try {
      const ds = await parseWorkbook(file);
      setDataset(ds);
      setPerMetric({});
      toast.success(`Loaded ${ds.rows.length} rows and ${ds.metrics.length} metrics`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  }, []);

  const result = useMemo(
    () =>
      dataset
        ? analyze(dataset, { window: windowSize, zThreshold: threshold, perMetric })
        : null,
    [dataset, windowSize, threshold, perMetric],
  );

  const sorted = useMemo(
    () => (result ? [...result.stats].sort((a, b) => Math.abs(b.z) - Math.abs(a.z)) : []),
    [result],
  );

  const handleMetricChange = useCallback((metric: string, patch: MetricSetting) => {
    setPerMetric((prev) => ({ ...prev, [metric]: { ...prev[metric], ...patch } }));
  }, []);

  const handleReset = useCallback((metric?: string) => {
    setPerMetric((prev) => {
      if (!metric) return {};
      const next = { ...prev };
      const enabled = next[metric]?.enabled;
      next[metric] = enabled === false ? { enabled: false } : {};
      return next;
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10">
      <Toaster position="top-right" />

      <header className="panel relative isolate overflow-hidden p-6 sm:p-9">
        <div className="flex flex-col-reverse items-center justify-between gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="label-mono flex items-center gap-2">
              <Radar className="h-3.5 w-3.5 animate-pulse text-primary" /> Automated metric
              monitoring
            </p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">AI Anomaly Agent</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Point it at an Excel or CSV sheet of business metrics. It builds a baseline, flags
              unusual movement, explains the change in business language, and emails an alert when
              something is off.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/history"
                className="label-mono group relative inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
              >
                <History className="h-4 w-4 transition-transform group-hover:-rotate-12" /> Alert
                history
              </Link>
              {result && (
                <div className="panel px-4 py-2 text-left">
                  <p className="label-mono text-xs">Latest period</p>
                  <p className="font-mono text-base font-bold">{result.latestDate}</p>
                  <p className="label-mono text-xs mt-0.5 text-amber-600 dark:text-amber-400">
                    {result.anomalies.length} anomal{result.anomalies.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="relative shrink-0">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-amber-500/60 hover:shadow-2xl">
              <img
                src="/hero-robot.png"
                alt="AI Anomaly Agent Bot"
                className="h-44 w-auto object-cover sm:h-52 md:h-56"
              />
              <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-amber-500/20" />
            </div>
          </div>
        </div>
      </header>


      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Ruler,
            title: "Global baseline window",
            value: `${windowSize} periods`,
            body: `"Normal" is learned from the last ${windowSize} rows before the newest one. The agent averages those ${windowSize} values to get a baseline. A short window (3–5) reacts fast but is jumpy; a long window (14–21) is stable but slow to notice a new trend.`,
          },
          {
            icon: Gauge,
            title: "Global sensitivity (z-score)",
            value: `${threshold.toFixed(1)}σ`,
            body: `A z-score says how many standard deviations the newest value sits from the baseline. At ${threshold.toFixed(
              1,
            )}σ a metric is flagged only when it moves further than usual noise. Lower it to catch more (more false alarms), raise it to only see big shocks.`,
          },
          {
            icon: SlidersHorizontal,
            title: "Per-metric thresholds",
            value: "overrides",
            body: "Every metric starts on the global settings. Use the panel below to give a noisy metric like Traffic a longer window or a stricter σ, tighten a critical one like Revenue, or switch a metric off so it never triggers an alert.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="panel group transition-all hover:-translate-y-1 hover:border-primary/50"
          >
            <div className="panel-head">
              <span className="label-mono flex items-center gap-2 text-foreground">
                <c.icon className="h-3.5 w-3.5 text-primary" /> {c.title}
              </span>
              <span className="font-mono text-xs text-primary">{c.value}</span>
            </div>
            <p className="p-5 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}

      </section>


      <section
        className="panel mt-8 p-6"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors ${
              dragging ? "border-primary bg-primary/10" : "border-border bg-background/40"
            }`}
          >
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <p className="mt-3 font-medium">Drop an .xlsx, .xls or .csv file here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              First sheet, one date column plus numeric metric columns.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Choose file
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDataset(sampleDataset());
                  setPerMetric({});
                  toast.success("Loaded sample business data");
                }}
              >
                Try sample data
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs">
              <a
                className="label-mono flex items-center gap-1 underline-offset-4 hover:underline"
                href="/sample-business-data.xlsx"
                download
              >
                <Download className="h-3 w-3" /> sample .xlsx
              </a>
              <a
                className="label-mono flex items-center gap-1 underline-offset-4 hover:underline"
                href="/sample-business-data.csv"
                download
              >
                <Download className="h-3 w-3" /> sample .csv
              </a>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="label-mono">Global baseline window</p>
                <span className="font-mono text-sm">{windowSize} periods</span>
              </div>
              <Slider
                className="mt-3"
                min={3}
                max={21}
                step={1}
                value={[windowSize]}
                onValueChange={(v) => setWindowSize(v[0] ?? 7)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="label-mono">Global sensitivity (z-score)</p>
                <span className="font-mono text-sm">{threshold.toFixed(1)}σ</span>
              </div>
              <Slider
                className="mt-3"
                min={1}
                max={4}
                step={0.5}
                value={[threshold]}
                onValueChange={(v) => setThreshold(v[0] ?? 2)}
              />
            </div>
            <p className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Baseline = average of the previous {windowSize} periods. A metric is flagged when the
              newest value sits more than {threshold.toFixed(1)} standard deviations away from that
              baseline. Override any single metric below.
            </p>
          </div>
        </div>
      </section>

      {dataset && result && (
        <>
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20">
              <ThresholdSettings
                metrics={dataset.metrics}
                globalWindow={windowSize}
                globalThreshold={threshold}
                perMetric={perMetric}
                onChange={handleMetricChange}
                onReset={handleReset}
              />
            </div>

            <section>
              <p className="label-mono flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" /> Metric check — {result.fileName}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {sorted.map((s) => (
                  <MetricCard key={s.metric} stat={s} />
                ))}
              </div>
            </section>
          </div>

          <section className="mt-10">
            <ReportPanel
              result={result}
              recipients={recipients}
              onRecipientsChange={updateRecipients}
              onLogged={addLog}
            />
          </section>
        </>
      )}


      <section className="mt-10">
        <div className="flex items-center justify-between">
          <p className="label-mono flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-primary" /> Recent alerts
          </p>
          <Link to="/history" className="label-mono underline-offset-4 hover:underline">
            View full history
          </Link>
        </div>
        <div className="panel mt-3 divide-y divide-border">
          {log.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No alerts sent yet.</p>
          )}
          {log.slice(0, 5).map((entry) => (
            <div key={entry.id} className="flex flex-wrap justify-between gap-2 p-4 text-sm">
              <span>{entry.subject}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {entry.recipients.join(", ")} · {new Date(entry.at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
