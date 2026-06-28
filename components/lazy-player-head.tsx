"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerHead } from "@/components/player-head";

interface LazyPlayerHeadProps {
  skinUrl?: string;
  playerUuid: string;
  size?: number;
  lang: string;
}

/**
 * Defers rendering a PlayerHead until its row scrolls into view, so a large
 * players table opens instantly instead of fetching every skin texture at once.
 * When the player has no direct skinUrl, the actual skin is resolved on demand
 * (Mojang/Drasl session-server fallback) via the textures route handler.
 */
export function LazyPlayerHead({ skinUrl, playerUuid, size = 32, lang }: LazyPlayerHeadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(skinUrl);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    // Only hit the server when visible and no direct skin URL is available.
    if (!visible || skinUrl) return;
    let cancelled = false;
    fetch(`/${lang}/admin/players/textures?uuid=${playerUuid}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { skinUrl?: string | null } | null) => {
        if (!cancelled && data?.skinUrl) setResolvedUrl(data.skinUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, skinUrl, playerUuid, lang]);

  if (!visible) {
    return (
      <div
        ref={ref}
        className="animate-pulse rounded bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div ref={ref}>
      <PlayerHead skinUrl={resolvedUrl} playerUuid={playerUuid} size={size} />
    </div>
  );
}
