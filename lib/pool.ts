/**
 * Run an async `task` over `items` with bounded concurrency. Sequential fan-out
 * of ~100 network calls blows the request timeout; a small pool cuts wall-time
 * by ~`limit`× while capping simultaneous load on the downstream API so it isn't
 * overwhelmed.
 *
 * If a `task` rejects, no new tasks are dispatched, already-running ones settle,
 * and the first error is rethrown — so a redirect()/notFound() thrown deep in a
 * task propagates cleanly without leaving sibling rejections unhandled.
 *
 * ponytail: hand-rolled pool over adding p-limit — a dozen lines, no dep.
 */
export async function runPool<T>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  let firstError: unknown;
  let stopped = false;
  const worker = async (): Promise<void> => {
    // `next++` is atomic here: JS is single-threaded and there's no await
    // between reading and incrementing, so no two workers grab the same index.
    while (next < items.length && !stopped) {
      const i = next++;
      try {
        await task(items[i], i);
      } catch (e) {
        // Keep the first error, stop new work, and swallow later ones so
        // Promise.all never sees a rejection (no unhandled sibling rejections).
        if (!stopped) {
          stopped = true;
          firstError = e;
        }
      }
    }
  };
  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, worker));
  if (stopped) throw firstError;
}
