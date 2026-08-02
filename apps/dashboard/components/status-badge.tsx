import type { SessionStatus } from "@observatory/shared";
import { AlertTriangle, CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { STATUS_COLOR } from "../lib/chart-colors";

const STATUS_META: Record<SessionStatus, { label: string; icon: typeof CheckCircle2 }> = {
  running: { label: "Running", icon: CircleDot },
  success: { label: "Success", icon: CheckCircle2 },
  partial: { label: "Partial", icon: AlertTriangle },
  failed: { label: "Failed", icon: XCircle },
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
      <Icon aria-hidden className="h-3.5 w-3.5" style={{ color: STATUS_COLOR[status] }} />
      {meta.label}
    </span>
  );
}
