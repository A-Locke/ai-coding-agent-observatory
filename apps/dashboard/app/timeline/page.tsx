import { redirect } from "next/navigation";
import { getMostRecentSessionId } from "../../lib/queries";
import { EmptyState } from "../../components/empty-state";

export const dynamic = "force-dynamic";

export default function TimelineIndexPage() {
  const sessionId = getMostRecentSessionId();
  if (!sessionId) {
    return <EmptyState title="No sessions to show a timeline for yet" />;
  }
  redirect(`/sessions/${encodeURIComponent(sessionId)}`);
}
