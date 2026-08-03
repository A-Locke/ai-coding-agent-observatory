import type { EventRowOut } from "../lib/queries";
import { summarizeAttributes } from "../lib/utils";

export function EventList({ events }: { events: EventRowOut[] }) {
  return (
    <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
          <span className="font-mono text-foreground">{event.name}</span>
          <span className="text-muted-foreground">{summarizeAttributes(event.attributes)}</span>
          <span className="text-muted-foreground">{new Date(event.occurredAt).toLocaleTimeString()}</span>
        </li>
      ))}
    </ol>
  );
}
