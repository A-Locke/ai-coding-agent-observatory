import { Download } from "lucide-react";

export function ExportLinks({ basePath }: { basePath: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-muted-foreground">
        <Download aria-hidden className="h-3.5 w-3.5" />
        Export:
      </span>
      <a href={`${basePath}?format=csv`} className="rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground hover:bg-muted">
        CSV
      </a>
      <a href={`${basePath}?format=json`} className="rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground hover:bg-muted">
        JSON
      </a>
    </div>
  );
}
