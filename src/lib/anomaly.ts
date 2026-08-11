export type MetricRow = { date: string; values: Record<string, number> };

export type Dataset = {
  fileName: string;
  metrics: string[];
  rows: MetricRow[];
};

export type Anomaly = {
  metric: string;
  date: string;
  current: number;
  baseline: number;
  stdev: number;
  z: number;
  pctChange: number;
  direction: "up" | "down";
  severity: "critical" | "warning" | "normal";
};

export type MetricStat = {
  metric: string;
  current: number;
  baseline: number;
  pctChange: number;
  z: number;
  direction: "up" | "down";
  severity: Anomaly["severity"];
  series: { date: string; value: number }[];
  window: number;
  zThreshold: number;
};

export type AnalysisResult = {
  fileName: string;
  generatedAt: string;
  latestDate: string;
  stats: MetricStat[];
  anomalies: Anomaly[];
  summary: string;
  impact: string[];
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

export const formatNumber = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs < 10 && !Number.isInteger(n)) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const formatPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

const LOWER_IS_BETTER = ["cost", "refund", "refunds", "churn", "bounce", "spend", "cpa"];

export const isLowerBetter = (metric: string) =>
  LOWER_IS_BETTER.some((k) => metric.toLowerCase().includes(k));

export type MetricSetting = { window?: number; zThreshold?: number; enabled?: boolean };
export type AnalyzeOptions = {
  window: number;
  zThreshold: number;
  perMetric?: Record<string, MetricSetting>;
};

export function analyze(dataset: Dataset, opts: AnalyzeOptions): AnalysisResult {
  const rows = dataset.rows;
  const latest = rows[rows.length - 1];
  const stats: MetricStat[] = [];

  for (const metric of dataset.metrics) {
    const setting = opts.perMetric?.[metric];
    if (setting?.enabled === false) continue;
    const window = setting?.window ?? opts.window;
    const zThreshold = setting?.zThreshold ?? opts.zThreshold;

    const series: { date: string; value: number }[] = [];
    for (const r of rows) {
      const v = r.values[metric];
      if (typeof v === "number" && Number.isFinite(v)) series.push({ date: r.date, value: v });
    }
    if (series.length < 2) continue;

    const current = series[series.length - 1]!.value;
    const history = series.slice(Math.max(0, series.length - 1 - window), series.length - 1);
    const baseline = mean(history.map((p) => p.value));
    const sd = stdev(history.map((p) => p.value));
    const pctChange = baseline === 0 ? 0 : ((current - baseline) / Math.abs(baseline)) * 100;
    const z = sd === 0 ? (Math.abs(pctChange) > 20 ? Math.sign(pctChange) * zThreshold : 0) : (current - baseline) / sd;
    const absZ = Math.abs(z);
    const severity: Anomaly["severity"] =
      absZ >= zThreshold + 1 ? "critical" : absZ >= zThreshold ? "warning" : "normal";

    stats.push({
      metric,
      current,
      baseline,
      pctChange,
      z,
      direction: current >= baseline ? "up" : "down",
      severity,
      series,
      window,
      zThreshold,
    });
  }

  const anomalies: Anomaly[] = stats
    .filter((s) => s.severity !== "normal")
    .map((s) => ({
      metric: s.metric,
      date: latest?.date ?? "",
      current: s.current,
      baseline: s.baseline,
      stdev: 0,
      z: s.z,
      pctChange: s.pctChange,
      direction: s.direction,
      severity: s.severity,
    }))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  const { summary, impact } = narrate(stats, anomalies, latest?.date ?? "");

  return {
    fileName: dataset.fileName,
    generatedAt: new Date().toISOString(),
    latestDate: latest?.date ?? "",
    stats,
    anomalies,
    summary,
    impact,
  };
}

const has = (stats: MetricStat[], name: string) =>
  stats.find((s) => s.metric.toLowerCase().includes(name));

function narrate(stats: MetricStat[], anomalies: Anomaly[], date: string) {
  const impact: string[] = [];

  if (anomalies.length === 0) {
    return {
      summary: `All tracked metrics for ${date} stayed within their normal range compared with the recent baseline. Nothing needs attention right now.`,
      impact: ["No action required. The agent will keep watching the next period."],
    };
  }

  const phrases = anomalies.map((a) => {
    const move = a.direction === "up" ? "increased sharply" : "dropped sharply";
    return `${a.metric} ${move} (${formatPct(a.pctChange)} vs a baseline of ${formatNumber(a.baseline)})`;
  });

  let summary = `On ${date}, ${phrases.slice(0, 3).join("; ")}`;
  if (phrases.length > 3) summary += `, plus ${phrases.length - 3} more metric(s) outside normal range`;
  summary += ".";

  const revenue = has(stats, "revenue");
  const conv = has(stats, "conversion");
  const traffic = has(stats, "traffic");
  const orders = has(stats, "order");
  const cost = has(stats, "cost");
  const refunds = has(stats, "refund");

  if (traffic && conv && traffic.direction === "up" && conv.direction === "down") {
    summary +=
      " Traffic volume improved while conversion rate declined, which usually points to a change in traffic quality rather than a demand problem.";
    impact.push("Paid or referral traffic may be attracting lower-intent visitors — check channel mix before scaling spend.");
  }
  if (revenue && orders && revenue.direction === "down" && orders.direction !== "down") {
    summary += " Revenue fell without a matching drop in orders, which suggests average order value shrank.";
    impact.push("Discounting or product mix is eating margin even though demand held up.");
  }
  if (cost && cost.direction === "up" && revenue && revenue.direction !== "up") {
    impact.push("Cost is rising faster than revenue — efficiency is deteriorating and margin is at risk.");
  }
  if (refunds && refunds.direction === "up") {
    impact.push("Refunds are climbing, which can signal a fulfilment, quality, or expectation-setting problem.");
  }

  const worst = anomalies[0];
  if (impact.length === 0 && worst) {
    const bad =
      (worst.direction === "down" && !isLowerBetter(worst.metric)) ||
      (worst.direction === "up" && isLowerBetter(worst.metric));
    impact.push(
      bad
        ? `${worst.metric} is the largest negative deviation this period and should be investigated first.`
        : `${worst.metric} is the largest deviation this period — confirm it is a genuine gain and not a tracking or duplication issue.`,
    );
  }

  return { summary, impact };
}

export function buildReportText(result: AnalysisResult) {
  const lines: string[] = [];
  lines.push(`ANOMALY REPORT — ${result.fileName}`);
  lines.push(`Period: ${result.latestDate}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(result.summary);
  lines.push("");
  lines.push("ANOMALIES DETECTED");
  if (result.anomalies.length === 0) lines.push("- None");
  for (const a of result.anomalies) {
    lines.push(
      `- [${a.severity.toUpperCase()}] ${a.metric}: ${formatNumber(a.current)} vs baseline ${formatNumber(
        a.baseline,
      )} (${formatPct(a.pctChange)}, z=${a.z.toFixed(2)})`,
    );
  }
  lines.push("");
  lines.push("WHY IT MATTERS");
  for (const i of result.impact) lines.push(`- ${i}`);
  return lines.join("\n");
}
