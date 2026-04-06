"use client";

import { useRef, useEffect } from "react";
import { UserIcon } from "lucide-react";

interface PlayerHeadProps {
  skinUrl?: string;
  size?: number;
  className?: string;
}

/**
 * Renders a Minecraft player head from a skin texture.
 * Extracts the 8x8 face from coordinates (8,8) in the skin,
 * plus the 8x8 hat overlay from (40,8), composited together.
 */
export function PlayerHead({ skinUrl, size = 48, className = "" }: PlayerHeadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!skinUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx.imageSmoothingEnabled = false;

      // Draw face (8x8 at position 8,8 in skin)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);
      // Draw hat overlay (8x8 at position 40,8 in skin)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);
    };

    img.onerror = () => {
      // Try fetching via blob to bypass CORS
      fetch(skinUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const img2 = new Image();
          img2.onload = () => {
            canvas.width = size;
            canvas.height = size;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img2, 8, 8, 8, 8, 0, 0, size, size);
            ctx.drawImage(img2, 40, 8, 8, 8, 0, 0, size, size);
            URL.revokeObjectURL(blobUrl);
          };
          img2.src = blobUrl;
        })
        .catch(() => {});
    };

    img.src = skinUrl;
  }, [skinUrl, size]);

  if (!skinUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <UserIcon className="size-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded bg-muted ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
