"use client";

import { useEffect, useRef } from "react";
import { SkinViewer, IdleAnimation } from "skinview3d";

interface SkinViewerProps {
  skinUrl?: string;
  capeUrl?: string;
  skinModel?: "classic" | "slim";
  width?: number;
  height?: number;
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

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl || undefined,
      cape: capeUrl || undefined,
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
    };
    // Only run on mount/unmount; updates handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update skin when props change (without recreating the viewer)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (skinUrl) {
      viewer.loadSkin(skinUrl, {
        model: skinModel === "slim" ? "slim" : "default",
      });
    } else {
      viewer.loadSkin(null);
    }
  }, [skinUrl, skinModel]);

  // Update cape when props change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (capeUrl) {
      viewer.loadCape(capeUrl);
    } else {
      viewer.loadCape(null);
    }
  }, [capeUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg"
      style={{ width, height }}
    />
  );
}
