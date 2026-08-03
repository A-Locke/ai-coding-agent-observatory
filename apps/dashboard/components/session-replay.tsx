"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { formatNumber, formatUsd } from "../lib/utils";

export interface ReplayStep {
  key: string;
  kind: "span" | "event";
  label: string;
  detail: string;
  timestampMs: number;
}

export interface ReplayMetricPoint {
  name: string;
  value: number;
  unit: string;
  timestampMs: number;
}

const FILE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "write_file", "replace", "edit"]);

const PLAYBACK_INTERVAL_MS = 700;

export function SessionReplay({ steps, metrics }: { steps: ReplayStep[]; metrics: ReplayMetricPoint[] }) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (position >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setPosition((p) => Math.min(p + 1, steps.length - 1)), PLAYBACK_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [playing, position, steps.length]);

  const currentTimestampMs = steps[position]?.timestampMs ?? 0;

  const { tokensSoFar, costSoFar } = useMemo(() => {
    let tokens = 0;
    let cost = 0;
    for (const m of metrics) {
      if (m.timestampMs > currentTimestampMs) continue;
      if (m.unit === "tokens") tokens += m.value;
      else if (m.unit === "USD") cost += m.value;
    }
    return { tokensSoFar: tokens, costSoFar: cost };
  }, [metrics, currentTimestampMs]);

  const fileTouches = useMemo(
    () => steps.filter((s) => FILE_TOOLS.has(s.label) || [...FILE_TOOLS].some((t) => s.detail.includes(`tool_name=${t}`) || s.detail.includes(`function_name=${t}`))),
    [steps]
  );

  if (steps.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPosition(0)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Restart"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setPosition(steps.length - 1)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Skip to end"
        >
          <SkipForward className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={position}
          onChange={(e) => {
            setPlaying(false);
            setPosition(Number(e.target.value));
          }}
          className="flex-1 accent-[hsl(var(--primary))]"
        />
        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {position + 1} / {steps.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xl font-semibold">{formatNumber(tokensSoFar)}</div>
          <p className="text-xs text-muted-foreground">Tokens so far</p>
        </div>
        <div>
          <div className="text-xl font-semibold">{formatUsd(costSoFar)}</div>
          <p className="text-xs text-muted-foreground">Cost so far (vendor-reported metrics only)</p>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        <ol className="flex flex-col divide-y divide-border">
          {steps.slice(0, position + 1).map((step, i) => (
            <li
              key={step.key}
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs ${i === position ? "bg-accent/60" : ""}`}
            >
              <span className="font-mono text-foreground">{step.label}</span>
              <span className="text-muted-foreground">{step.detail}</span>
            </li>
          ))}
        </ol>
      </div>

      {fileTouches.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">File modifications ({fileTouches.length})</p>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {fileTouches.map((s) => (
              <li key={s.key}>
                {s.label} — {s.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
