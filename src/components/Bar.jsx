"use client";
import { Shape } from "react-konva";
import { gridPt, isoBox, neonStrip, drawStaffSprite, EQUIPMENT_NEON, EQUIPMENT_NEON_2 } from "./isoDrawing";

// Bar along the back-right wall: bottle shelf, counter and stools. The bartender is drawn
// between the shelf and counter (with a gap left for him to stand in) so the counter
// correctly occludes his lower body, and idle-bobs like the DJ rather than standing frozen.
export default function Bar({ g, sx, sy, uiScale, bartenderImage, bartenderBounce = 0 }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        drawBar(ctx, g, sx, sy, uiScale, bartenderImage, bartenderBounce);
      }}
    />
  );
}

function drawBar(ctx, g, sx, sy, uiScale, bartenderImage, bartenderBounce) {
  const neon = EQUIPMENT_NEON;
  const neon2 = EQUIPMENT_NEON_2;

  const shelfH = 28 * sy;
  const shelf = isoBox(ctx, g, 5.9, 0.06, 2.6, 0.36, shelfH, { top: "#2e2e56", right: "#191932", left: "#121226", edge: "#3f3f6b" });
  ctx.save();
  const bottleCols = [neon, neon2, "#f5c95c", "#aab0ff", neon, "#f5c95c"];
  for (let row = 0; row < 2; row++) {
    for (let n = 0; n < 6; n++) {
      const p = gridPt(g, 6.08 + n * 0.42, 0.22);
      const bh = (5.5 + (n % 3) * 1.8) * sy;
      const by = p.y - shelfH * (row === 0 ? 0.66 : 0.3);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = bottleCols[(n + row * 2) % bottleCols.length];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 7 * uiScale;
      ctx.fillRect(p.x - 1.5 * sx, by - bh, 3 * sx, bh);
    }
  }
  ctx.restore();
  neonStrip(ctx, { x: shelf.D.x, y: shelf.D.y }, { x: shelf.C.x, y: shelf.C.y }, neon, 1.6, 0.5, uiScale);

  // Counter sits a bit further out from the shelf than a bare fit needs, so the
  // bartender has some breathing room to stand in between.
  const barGap = 0.28;
  drawStaffSprite(ctx, sx, sy, bartenderImage, gridPt(g, 7.1, 0.68), 4 * sy + bartenderBounce * sy);

  const counterH = 14 * sy;
  const counter = isoBox(ctx, g, 5.8, 0.72 + barGap, 2.8, 1.1, counterH, { top: "#75759f", right: "#22223d", left: "#17172e", edge: "#8b8bb4" });
  neonStrip(ctx, counter.D, counter.C, neon2, 2.6, 0.95, uiScale);
  neonStrip(ctx, counter.C, counter.B, neon2, 2.6, 0.95, uiScale);
  neonStrip(ctx, counter.floorD, counter.floorC, neon2, 3.2, 0.28, uiScale);
  // Stools on the floor side.
  [0.6, 1.5, 2.4].forEach((off) => {
    const p = gridPt(g, 5.8 + off, 2.25 + barGap);
    const h = 9.5 * sy;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * sy, 5 * sx, 2.6 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#3d3d5e";
    ctx.lineWidth = 1.6 * uiScale;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - h);
    ctx.stroke();
    ctx.fillStyle = "#3f3f63";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - h, 4.8 * sx, 2.6 * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5a5a86";
    ctx.lineWidth = 1 * uiScale;
    ctx.stroke();
    ctx.restore();
  });
}
