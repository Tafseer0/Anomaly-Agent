import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { MetricSetting } from "@/lib/anomaly";

export function ThresholdSettings({
  metrics,
  globalWindow,
  globalThreshold,
  perMetric,
  onChange,
  onReset,
}: {
  metrics: string[];
  globalWindow: number;
  globalThreshold: number;
  perMetric: Record<string, MetricSetting>;
  onChange: (metric: string, patch: MetricSetting) => void;
  onReset: (metric?: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const overrides = Object.values(perMetric).filter(
    (s) => s.window != null || s.zThreshold != null || s.enabled === false,
  ).length;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="label-mono flex items-center gap-2 hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Per-metric thresholds
          {overrides > 0 && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
              {overrides}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <Button variant="ghost" size="sm" onClick={() => onReset()}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset all
        </Button>
      </div>

      {open && (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Every metric starts on the global settings ({globalWindow} periods,{" "}
            {globalThreshold.toFixed(1)}σ). Changes apply instantly to the metric check.
          </p>

          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {metrics.map((m) => {
              const s = perMetric[m] ?? {};
              const win = s.window ?? globalWindow;
              const z = s.zThreshold ?? globalThreshold;
              const enabled = s.enabled !== false;
              const custom = s.window != null || s.zThreshold != null;
              return (
                <div key={m} className="rounded-xl border border-border bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m}</p>
                      <p className="label-mono mt-0.5 text-[10px]">
                        {custom ? "custom" : "inherits global"}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => onChange(m, { enabled: v })}
                      aria-label={`Monitor ${m}`}
                    />
                  </div>

                  <div className={enabled ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-40"}>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="label-mono text-[10px]">Baseline window</span>
                        <span className="font-mono">{win} periods</span>
                      </div>
                      <Slider
                        className="mt-2"
                        min={3}
                        max={21}
                        step={1}
                        disabled={!enabled}
                        value={[win]}
                        onValueChange={(v) => onChange(m, { window: v[0] ?? globalWindow })}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="label-mono text-[10px]">Sensitivity</span>
                        <span className="font-mono">{z.toFixed(1)}σ</span>
                      </div>
                      <Slider
                        className="mt-2"
                        min={1}
                        max={4}
                        step={0.5}
                        disabled={!enabled}
                        value={[z]}
                        onValueChange={(v) => onChange(m, { zThreshold: v[0] ?? globalThreshold })}
                      />
                    </div>
                    {custom && (
                      <Button variant="ghost" size="sm" onClick={() => onReset(m)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Use global
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
