import { AlertTriangle } from "lucide-react";
import type { SessionAlert } from "../lib/alerts";
import { STATUS_COLOR } from "../lib/chart-colors";

export function AlertBadges({ alerts }: { alerts: SessionAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {alerts.map((alert) => (
        <span
          key={alert.kind}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium"
        >
          <AlertTriangle aria-hidden className="h-3 w-3" style={{ color: STATUS_COLOR.partial }} />
          {alert.label}
        </span>
      ))}
    </div>
  );
}
