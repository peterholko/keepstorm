"use client";

import { useEffect, useRef } from "react";
import { drawAtlasCell, loadProcessedAtlas } from "./atlas-assets";

interface AtlasSpriteProps {
  src: string;
  index: number;
  label?: string;
  className?: string;
  rows?: number;
  columns?: number;
}

export default function AtlasSprite({ src, index, label, className, rows = 2, columns = 4 }: AtlasSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    loadProcessedAtlas(src).then((atlas) => {
      if (!active || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawAtlasCell(context, atlas, index, canvas.width / 2, canvas.height / 2, canvas.width * 0.96, canvas.height * 0.96, false, rows, columns);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [columns, index, rows, src]);

  return <canvas ref={canvasRef} width={240} height={190} className={className} aria-label={label} role={label ? "img" : undefined} />;
}
