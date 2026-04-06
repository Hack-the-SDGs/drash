export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="rounded-lg border p-6 space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
