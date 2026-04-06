export default function InvitesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <h1 className="h-8 w-48 rounded bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border">
        <div className="h-10 border-b bg-muted/50" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-4 w-56 rounded bg-muted" />
            <div className="ml-auto h-7 w-14 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
