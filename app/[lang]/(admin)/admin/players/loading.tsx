export default function PlayersLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="h-9 w-64 rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-3">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-8 rounded bg-muted" />
            <div className="h-5 w-14 rounded-full bg-muted" />
            <div className="ml-auto h-7 w-14 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
