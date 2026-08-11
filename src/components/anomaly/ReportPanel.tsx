import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  Lightbulb,
  Mail,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
  Layers,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendAnomalyAlert } from "@/lib/alerts.functions";
import { generateAiInsights, type AiInsightResult } from "@/lib/ai.functions";
import type { AnalysisResult } from "@/lib/anomaly";
import { buildReportText, formatNumber, formatPct } from "@/lib/anomaly";
import type { AlertLogEntry } from "@/lib/alert-log";
import { cn } from "@/lib/utils";

function toHtml(result: AnalysisResult, aiResult?: AiInsightResult | null, includeAi = true) {
  const rows = result.anomalies
    .map(
      (a) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${a.metric}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${formatNumber(a.current)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${formatNumber(a.baseline)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:${a.direction === "up" ? "#0f766e" : "#b91c1c"}">${formatPct(a.pctChange)}</td></tr>`,
    )
    .join("");

  let aiHtml = "";
  if (includeAi && aiResult && aiResult.success) {
    aiHtml = `
    <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;">
      <h3 style="margin:0 0 8px;color:#1e293b;font-size:16px">✨ AI Strategic Insights (Google Gemini)</h3>
      ${aiResult.summary ? `<p style="margin:0 0 12px;font-weight:600;color:#334155">${aiResult.summary}</p>` : ""}
      
      ${
        aiResult.correlations && aiResult.correlations.length > 0
          ? `<strong style="color:#d97706">Cross-Metric Correlations:</strong><ul style="margin:4px 0 12px;padding-left:20px">${aiResult.correlations.map((c) => `<li>${c}</li>`).join("")}</ul>`
          : ""
      }
      ${
        aiResult.hiddenRisks && aiResult.hiddenRisks.length > 0
          ? `<strong style="color:#dc2626">Hidden Risks & Nuances:</strong><ul style="margin:4px 0 12px;padding-left:20px">${aiResult.hiddenRisks.map((r) => `<li>${r}</li>`).join("")}</ul>`
          : ""
      }
      ${
        aiResult.recommendations && aiResult.recommendations.length > 0
          ? `<strong style="color:#16a34a">Strategic Recommendations:</strong><ul style="margin:4px 0 0;padding-left:20px">${aiResult.recommendations.map((rec) => `<li>${rec}</li>`).join("")}</ul>`
          : ""
      }
    </div>`;
  }

  return `<div style="font-family:Arial,sans-serif;color:#111827;max-width:640px">
    <h2 style="margin:0 0 4px">Anomaly alert — ${result.fileName}</h2>
    <p style="margin:0 0 16px;color:#6b7280">Period: ${result.latestDate}</p>
    <p style="line-height:1.6">${result.summary}</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px">
      <tr style="text-align:left;background:#f3f4f6"><th style="padding:6px 10px">Metric</th><th style="padding:6px 10px">Current</th><th style="padding:6px 10px">Baseline</th><th style="padding:6px 10px">Change</th></tr>
      ${rows || `<tr><td colspan="4" style="padding:8px 10px">No anomalies detected</td></tr>`}
    </table>
    <h3 style="margin:16px 0 6px">Why it matters</h3>
    <ul style="line-height:1.6">${result.impact.map((i) => `<li>${i}</li>`).join("")}</ul>
    ${aiHtml}
  </div>`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AiTab = "all" | "summary" | "correlations" | "risks" | "recommendations";

export function ReportPanel({
  result,
  recipients,
  onRecipientsChange,
  onLogged,
}: {
  result: AnalysisResult;
  recipients: string[];
  onRecipientsChange: (next: string[]) => void;
  onLogged: (entry: AlertLogEntry) => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeAiInEmail, setIncludeAiInEmail] = useState(true);
  const [activeTab, setActiveTab] = useState<AiTab>("all");

  const send = useServerFn(sendAnomalyAlert);
  const runAi = useServerFn(generateAiInsights);

  const [aiResult, setAiResult] = useState<AiInsightResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleRunAi = async () => {
    setAiLoading(true);
    try {
      const res = await runAi({
        data: {
          fileName: result.fileName,
          latestDate: result.latestDate,
          anomalies: result.anomalies.map((a) => ({
            metric: a.metric,
            current: a.current,
            baseline: a.baseline,
            pctChange: a.pctChange,
            direction: a.direction,
            severity: a.severity,
            z: a.z,
          })),
          allMetricsStats: result.stats.map((s) => ({
            metric: s.metric,
            current: s.current,
            baseline: s.baseline,
            pctChange: s.pctChange,
            z: s.z,
          })),
        },
      });
      setAiResult(res);
      if (res.success) {
        toast.success("AI Strategic Insights generated with Gemini!");
      } else {
        toast.error(res.error || "Failed to generate AI insights");
      }
    } catch {
      toast.error("Could not reach AI service");
    } finally {
      setAiLoading(false);
    }
  };

  const formattedAiMarkdown = useMemo(() => {
    if (!aiResult || !aiResult.success) return "";
    let md = `### 🤖 Gemini AI Strategic Insights — ${result.fileName} (${result.latestDate})\n\n`;
    if (aiResult.summary) md += `**Executive Summary:**\n${aiResult.summary}\n\n`;
    if (aiResult.correlations?.length) {
      md += `**Cross-Metric Correlations:**\n${aiResult.correlations.map((c) => `- ${c}`).join("\n")}\n\n`;
    }
    if (aiResult.hiddenRisks?.length) {
      md += `**Hidden Risks & Nuances:**\n${aiResult.hiddenRisks.map((r) => `- ${r}`).join("\n")}\n\n`;
    }
    if (aiResult.recommendations?.length) {
      md += `**Strategic Recommendations:**\n${aiResult.recommendations.map((rec) => `- ${rec}`).join("\n")}\n\n`;
    }
    return md.trim();
  }, [aiResult, result.fileName, result.latestDate]);

  const handleCopyAi = () => {
    if (!formattedAiMarkdown) return;
    navigator.clipboard.writeText(formattedAiMarkdown);
    setCopied(true);
    toast.success("AI Insights copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const fullReportText = useMemo(() => {
    let txt = buildReportText(result);
    if (includeAiInEmail && formattedAiMarkdown) {
      txt += `\n\n----------------------------------------\n${formattedAiMarkdown}`;
    }
    return txt;
  }, [result, includeAiInEmail, formattedAiMarkdown]);

  const autoSubject = useMemo(
    () =>
      result.anomalies.length > 0
        ? `[Anomaly Agent] ${result.anomalies.length} metric(s) off baseline — ${result.latestDate}`
        : `[Anomaly Agent] All clear — ${result.latestDate}`,
    [result.anomalies.length, result.latestDate],
  );

  const [subject, setSubject] = useState(autoSubject);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (!edited) setSubject(autoSubject);
  }, [autoSubject, edited]);

  const commitDraft = () => {
    const parts = draft
      .split(/[\s,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    if (invalid.length > 0) {
      toast.error(`Not a valid email: ${invalid.join(", ")}`);
      return;
    }
    const next = Array.from(new Set([...recipients, ...parts]));
    if (next.length > 20) {
      toast.error("Up to 20 recipients");
      return;
    }
    onRecipientsChange(next);
    setDraft("");
  };

  const handleSend = async () => {
    const list = recipients;
    if (list.length === 0) return;
    setSending(true);
    const base = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      recipients: list,
      subject,
      fileName: result.fileName,
      period: result.latestDate,
      metrics: result.anomalies.map((a) => a.metric),
      count: result.anomalies.length,
    };
    try {
      const res = await send({
        data: {
          to: list,
          subject,
          text: fullReportText,
          html: toHtml(result, aiResult, includeAiInEmail),
        },
      });
      if (res.sent) {
        toast.success(`Alert sent to ${list.length} recipient${list.length === 1 ? "" : "s"}`);
        onLogged({ ...base, status: "sent" });
      } else {
        toast.error(res.error ?? "Could not send the alert");
        onLogged({ ...base, status: "failed", error: res.error ?? "Unknown error" });
      }
    } catch {
      toast.error("Could not reach the mail service");
      onLogged({ ...base, status: "failed", error: "Could not reach the mail service" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🚀 FULL-WIDTH INTERACTIVE AI DEEP INSIGHTS MODULE */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/70 to-background p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner ring-1 ring-primary/40">
              <Bot className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold tracking-tight">AI Deep Insights Engine</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Automated cross-metric analysis, hidden risk detection & strategic recommendations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {aiResult?.success && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleCopyAi}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy Markdown"}
              </Button>
            )}

            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary via-indigo-600 to-violet-600 text-primary-foreground shadow-md shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-lg"
              onClick={handleRunAi}
              disabled={aiLoading}
            >
              <Sparkles className={cn("h-4 w-4", aiLoading && "animate-spin")} />
              {aiLoading ? "Analyzing Metrics with Gemini…" : aiResult ? "Regenerate AI Insights" : "Generate AI Insights"}
            </Button>
          </div>
        </div>

        {/* Interactive Tabs & Filtering Header when insights are available */}
        {aiResult?.success && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 p-1 backdrop-blur-sm">
              {[
                { id: "all", label: "All Insights", icon: Layers },
                { id: "summary", label: "Executive Summary", icon: FileText },
                { id: "correlations", label: "Correlations", icon: TrendingUp },
                { id: "risks", label: "Hidden Risks", icon: ShieldAlert },
                { id: "recommendations", label: "Recommendations", icon: Lightbulb },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as AiTab)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={includeAiInEmail}
                onChange={(e) => setIncludeAiInEmail(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span>Append AI Insights to Email Alert</span>
            </label>
          </div>
        )}

        {/* AI Insight Content Display */}
        {!aiResult && !aiLoading && (
          <div className="relative mt-5 flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/30 p-8 text-center shadow-lg backdrop-blur-md">
            {/* Robot Image Background with Overlay */}
            <div
              className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat opacity-45 dark:opacity-40"
              style={{ backgroundImage: `url('/AI Card Image.jpg')` }}
            />
            <div className="absolute inset-0 -z-15 bg-gradient-to-t from-background via-background/75 to-background/40" />

            {/* Centered Content */}
            <div className="relative z-10 flex max-w-md flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner ring-1 ring-primary/30 backdrop-blur-sm">
                <Sparkles className="h-6 w-6 animate-bounce" />
              </div>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-foreground">
                Ready for Deep AI Synthesis
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Click <strong className="text-foreground">"Generate AI Insights"</strong> above to let AI analyze metric correlations, identify underlying risks, and provide actionable business advice.
              </p>
            </div>
          </div>
        )}

        {aiLoading && (
          <div className="mt-5 space-y-3 rounded-xl border border-primary/20 bg-background/60 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-spin text-primary" />
              <p className="font-mono text-xs font-medium animate-pulse text-primary">
                Gemini is synthesizing metric statistical deviations and correlation vectors...
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-primary/20" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-primary/15" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-primary/10" />
            </div>
          </div>
        )}

        {aiResult && aiResult.success && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(activeTab === "all" || activeTab === "summary") && aiResult.summary && (
              <div className={cn("rounded-xl border border-primary/30 bg-background/80 p-5 shadow-sm backdrop-blur-md transition-all hover:border-primary/50", activeTab === "all" && "lg:col-span-2")}>
                <p className="label-mono flex items-center gap-2 text-xs text-primary font-bold">
                  <FileText className="h-3.5 w-3.5" /> Executive Summary
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{aiResult.summary}</p>
              </div>
            )}

            {(activeTab === "all" || activeTab === "correlations") && aiResult.correlations && aiResult.correlations.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm backdrop-blur-md transition-all hover:border-amber-500/50">
                <p className="label-mono flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold">
                  <TrendingUp className="h-3.5 w-3.5" /> Cross-Metric Correlations
                </p>
                <ul className="mt-3 space-y-2">
                  {aiResult.correlations.map((c, i) => (
                    <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(activeTab === "all" || activeTab === "risks") && aiResult.hiddenRisks && aiResult.hiddenRisks.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm backdrop-blur-md transition-all hover:border-destructive/50">
                <p className="label-mono flex items-center gap-2 text-xs text-destructive font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" /> Hidden Risks & Nuances
                </p>
                <ul className="mt-3 space-y-2">
                  {aiResult.hiddenRisks.map((r, i) => (
                    <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(activeTab === "all" || activeTab === "recommendations") && aiResult.recommendations && aiResult.recommendations.length > 0 && (
              <div className={cn("rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm backdrop-blur-md transition-all hover:border-emerald-500/50", activeTab === "all" && "lg:col-span-2")}>
                <p className="label-mono flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <Lightbulb className="h-3.5 w-3.5" /> Strategic Recommendations
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {aiResult.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-background/50 p-3 text-xs leading-relaxed">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {aiResult && !aiResult.success && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
            <p className="font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Setup or Configuration Note:
            </p>
            <p className="mt-1">{aiResult.error}</p>
          </div>
        )}
      </section>

      {/* 📊 BALANCED 2-COLUMN REPORT BREAKDOWN & EMAIL DISPATCHER */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Left Column: Business Summary & Anomaly Breakdown */}
        <div className="panel p-6 space-y-6">
          <div>
            <p className="label-mono">Business summary</p>
            <p className="mt-3 text-lg leading-relaxed">{result.summary}</p>
          </div>

          <div>
            <p className="label-mono">Why it matters</p>
            <ul className="mt-2 space-y-2">
              {result.impact.map((i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {i}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label-mono">Anomaly report</p>
            <div className="mt-2 space-y-2">
              {result.anomalies.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Every metric is inside its normal range.
                </div>
              )}
              {result.anomalies.map((a) => (
                <div
                  key={a.metric}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:scale-[1.01]",
                    a.severity === "critical"
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-warning/40 bg-warning/10",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4",
                        a.severity === "critical" ? "text-destructive" : "text-warning",
                      )}
                    />
                    {a.metric} {a.direction === "up" ? "spiked" : "dropped"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatNumber(a.current)} vs {formatNumber(a.baseline)} · {formatPct(a.pctChange)} · z={a.z.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Email Alert Dispatcher */}
        <div className="panel flex flex-col p-6 space-y-4">
          <p className="label-mono">Email alert dispatcher</p>
          <p className="text-sm text-muted-foreground">
            Add recipients to automatically dispatch this report with optional AI Insights.
          </p>

          <div className="space-y-3">
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <span
                    key={r}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs"
                  >
                    {r}
                    <button
                      type="button"
                      aria-label={`Remove ${r}`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() => onRecipientsChange(recipients.filter((x) => x !== r))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="analyst@company.com"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "," || e.key === " ") {
                    e.preventDefault();
                    commitDraft();
                  }
                }}
              />
              <Button variant="secondary" onClick={commitDraft} disabled={!draft.trim()}>
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="label-mono flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Email subject
                </p>
                {edited && (
                  <button
                    type="button"
                    className="label-mono flex items-center gap-1 transition-colors hover:text-primary"
                    onClick={() => {
                      setEdited(false);
                      setSubject(autoSubject);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Auto
                  </button>
                )}
              </div>
              <Input
                className="mt-2 font-mono text-xs"
                value={subject}
                maxLength={200}
                placeholder="Subject line"
                onChange={(e) => {
                  setEdited(true);
                  setSubject(e.target.value);
                }}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {edited ? "Custom subject — this is what recipients will see." : "Auto-generated from the latest analysis. Edit it to use your own wording."}
              </p>
            </div>

            <Button
              className="w-full transition-transform hover:-translate-y-0.5"
              onClick={handleSend}
              disabled={recipients.length === 0 || sending || !subject.trim()}
            >
              {sending ? (
                "Sending…"
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send alert
                  {recipients.length > 0 ? ` to ${recipients.length}` : ""}
                </>
              )}
            </Button>
          </div>

          <div className="pt-2">
            <p className="label-mono text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Outgoing Report Preview
            </p>
            <pre className="max-h-60 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground shadow-inner">
              {fullReportText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

