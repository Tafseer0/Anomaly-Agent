import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { MetricStat } from "@/lib/anomaly";
import { formatNumber, formatPct, isLowerBetter } from "@/lib/anomaly";
import { cn } from "@/lib/utils";

export function MetricCard({ stat }: { stat: MetricStat }) {
  const bad =
    (stat.direction === "down" && !isLowerBetter(stat.metric)) ||
    (stat.direction === "up" && isLowerBetter(stat.metric));

  const tone =
    stat.severity === "normal"
      ? "text-muted-foreground"
      : bad
        ? "text-destructive"
        : "text-success";

  const stroke =
    stat.severity === "normal"
      ? "var(--muted-foreground)"
      : bad
        ? "var(--destructive)"
        : "var(--success)";

  const Icon = stat.direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "panel transition-all hover:-translate-y-0.5",
        stat.severity === "critical" && "border-destructive/60",
        stat.severity === "warning" && "border-warning/50",
      )}
    >
      <div className="panel-head">
        <p className="label-mono truncate text-foreground">{stat.metric}</p>
        {stat.severity !== "normal" && (
          <span
            className={cn(
              "label-mono rounded-full px-2 py-0.5",
              stat.severity === "critical"
                ? "bg-destructive/15 text-destructive"
                : "bg-warning/15 text-warning",
            )}
          >
            {stat.severity}
          </span>
        )}
      </div>

      <div className="p-4">
      <p className="font-display text-2xl font-semibold">{formatNumber(stat.current)}</p>


      <div className={cn("mt-1 flex items-center gap-1 text-sm font-medium", tone)}>
        <Icon className="h-4 w-4" />
        {formatPct(stat.pctChange)}
        <span className="text-muted-foreground font-normal">
          vs {formatNumber(stat.baseline)} baseline
        </span>
      </div>

      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stat.series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`g-${stat.metric.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={1.6}
              fill={`url(#g-${stat.metric.replace(/\W/g, "")})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="label-mono mt-1">z = {stat.z.toFixed(2)}</p>
      </div>
    </div>
  );
}

