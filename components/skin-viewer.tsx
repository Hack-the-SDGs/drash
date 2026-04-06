"use client";

import { useEffect, useRef, useCallback } from "react";
import { SkinViewer, IdleAnimation } from "skinview3d";

interface SkinViewerProps {
  skinUrl?: string;
  capeUrl?: string;
  skinModel?: "classic" | "slim";
  width?: number;
  height?: number;
}

/**
 * Fetch an image URL and return a blob URL.
 * This avoids CORS issues with the skinview3d library, which sets
 * crossOrigin="anonymous" on Image elements. If the texture server
 * doesn't return CORS headers, the image load fails silently.
 * By fetching via fetch() and creating a blob URL, we sidestep this.
 */
async function fetchAsBlobUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function SkinViewerComponent({
  skinUrl,
  capeUrl,
  skinModel = "classic",
  width = 300,
  height = 400,
}: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const revokeBlobUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      model: skinModel === "slim" ? "slim" : "default",
      background: 0x1a1a2e,
      animation: new IdleAnimation(),
    });

    viewer.autoRotate = true;
    viewer.autoRotateSpeed = 0.5;
    viewer.zoom = 0.9;

    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
      revokeBlobUrls();
    };
    // Only run on mount/unmount; updates handled by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update skin when props change (without recreating the viewer)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!skinUrl) {
      viewer.loadSkin(null);
      return;
    }

    // For blob:/data: URLs (local previews), load directly
    if (skinUrl.startsWith("blob:") || skinUrl.startsWith("data:")) {
      viewer.loadSkin(skinUrl, {
        model: skinModel === "slim" ? "slim" : "default",
      });
      return;
    }

    // For remote URLs, fetch as blob to avoid CORS issues
    let cancelled = false;
    fetchAsBlobUrl(skinUrl)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        blobUrlsRef.current.push(blobUrl);
        viewer.loadSkin(blobUrl, {
          model: skinModel === "slim" ? "slim" : "default",
        });
      })
      .catch(() => {
        // Fallback: try loading the URL directly
        if (!cancelled) {
          viewer.loadSkin(skinUrl, {
            model: skinModel === "slim" ? "slim" : "default",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skinUrl, skinModel]);

  // Update cape when props change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!capeUrl) {
      viewer.loadCape(null);
      return;
    }

    // For blob:/data: URLs (local previews), load directly
    if (capeUrl.startsWith("blob:") || capeUrl.startsWith("data:")) {
      viewer.loadCape(capeUrl);
      return;
    }

    // For remote URLs, fetch as blob to avoid CORS issues
    let cancelled = false;
    fetchAsBlobUrl(capeUrl)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        blobUrlsRef.current.push(blobUrl);
        viewer.loadCape(blobUrl);
      })
      .catch(() => {
        // Fallback: try loading the URL directly
        if (!cancelled) {
          viewer.loadCape(capeUrl);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [capeUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ width, height }}
    />
  );
}
