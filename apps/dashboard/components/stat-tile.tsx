import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {sublabel ? <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p> : null}
      </CardContent>
    </Card>
  );
}
