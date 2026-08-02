import type { AgentType } from "@observatory/shared";
import { AGENT_LABEL, AGENT_SERIES_COLOR } from "../lib/chart-colors";

export function AgentBadge({ agentType }: { agentType: AgentType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_SERIES_COLOR[agentType] }} />
      {AGENT_LABEL[agentType]}
    </span>
  );
}
