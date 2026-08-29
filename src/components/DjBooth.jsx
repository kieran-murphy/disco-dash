"use client";
import { Shape } from "react-konva";
import {
  gridPt,
  isoBox,
  isoLBox,
  neonStrip,
  drawStaffSprite,
  EQUIPMENT_NEON,
  EQUIPMENT_NEON_2,
  EQUIPMENT_BODY_COLORS,
  EQUIPMENT_DARK_COLORS,
} from "./isoDrawing";

// How far into the floor the booth's arms reach (tile-grid j units, back-tip reference
// frame) — ClubGameInner uses this to keep dancers from wandering into it.
export const DJ_BOOTH_BACK_LIMIT = 214;

// DJ booth: an L-shaped riser hugging the two back walls, its near/tip-side corner left
// open as a floor-level recess — that open notch is the DJ's own one-tile spot, tucked
// between the two arms instead of standing on top of them. Desk sits further out on the
// solid arms, decks on the desk, with two speaker stacks flanking the whole booth.
export default function DjBooth({ g, sx, sy, uiScale, djImage, djBounce = 0 }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        drawDjBooth(ctx, g, sx, sy, uiScale, djImage, djBounce);
      }}
    />
  );
}

function drawDjBooth(ctx, g, sx, sy, uiScale, djImage, djBounce) {
  const neon = EQUIPMENT_NEON;
  const neon2 = EQUIPMENT_NEON_2;

  const riserH = 11 * sy;
  const riserFull = 2.8;
  const riserArm = riserFull / 2; // even sides
  const riser = isoLBox(ctx, g, 0.35, 0.35, riserFull, riserArm, riserH, EQUIPMENT_BODY_COLORS);
  neonStrip(ctx, riser.jFar, riser.outerCorner, neon, 2, 0.75, uiScale);
  neonStrip(ctx, riser.iNear, riser.outerCorner, neon, 2, 0.75, uiScale);

  // The DJ stands at floor level in the open notch (his one-tile spot) — just a gentle
  // idle bob, no walking.
  drawStaffSprite(ctx, sx, sy, djImage, gridPt(g, 1.05, 1.05), djBounce * sy);

  // Desk sits on the solid arms, out past the elbow, with a margin on both sides.
  const deskOrigin = 1.95;
  const deskSize = 1.0;
  const deskScale = deskSize / 1.7; // relative to the original square desk's decorations
  const deskH = 9 * sy;
  const desk = isoBox(ctx, g, deskOrigin, deskOrigin, deskSize, deskSize, deskH, EQUIPMENT_DARK_COLORS, riserH);
  neonStrip(ctx, desk.D, desk.C, neon2, 2.4, 0.95, uiScale);
  neonStrip(ctx, desk.C, desk.B, neon2, 2.4, 0.95, uiScale);

  // Two platters and a mixer on the desk surface, scaled down to match the smaller desk.
  const deskCenter = deskOrigin + deskSize / 2;
  const deckTop = gridPt(g, deskCenter, deskCenter);
  const platter = (di, dj) => {
    const p = gridPt(g, deskCenter + di * deskScale, deskCenter + dj * deskScale);
    const cy = p.y - riserH - deskH;
    ctx.save();
    ctx.fillStyle = "#15152b";
    ctx.beginPath();
    ctx.ellipse(p.x, cy, 7.5 * deskScale * sx, 4.2 * deskScale * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#aab0ff";
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2 * uiScale;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = neon;
    ctx.beginPath();
    ctx.ellipse(p.x, cy, 2.1 * deskScale * sx, 1.3 * deskScale * sy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  platter(-0.45, 0.34);
  platter(0.34, -0.45);
  ctx.save();
  ctx.fillStyle = "#15152b";
  ctx.beginPath();
  ctx.ellipse(deckTop.x, deckTop.y - riserH - deskH, 5.4 * deskScale * sx, 3.1 * deskScale * sy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  [-2.2, 0, 2.2].forEach((off, n) => {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = n === 1 ? neon2 : neon;
    ctx.fillRect(
      deckTop.x + off * deskScale * sx - 0.8 * deskScale * sx,
      deckTop.y - riserH - deskH - 1.8 * deskScale * sy,
      1.6 * deskScale * sx,
      3.6 * deskScale * sy
    );
    ctx.restore();
  });

  // Speaker stacks flanking the booth.
  const speaker = (i, j) => {
    const lowH = 25 * sy;
    const topH = 16 * sy;
    const low = isoBox(ctx, g, i, j, 1.05, 1.05, lowH, EQUIPMENT_BODY_COLORS);
    const up = isoBox(ctx, g, i + 0.08, j + 0.08, 0.89, 0.89, topH, EQUIPMENT_DARK_COLORS, lowH);
    const cone = (cx, cy, ry) => {
      ctx.save();
      ctx.fillStyle = "#121224";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 5.4 * sx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a4a70";
      ctx.lineWidth = 1 * uiScale;
      ctx.stroke();
      ctx.restore();
    };
    cone(low.C.x, low.C.y + lowH * 0.4, 5.4 * sy);
    cone(low.C.x, low.C.y + lowH * 0.76, 3.6 * sy);
    cone(up.C.x, up.C.y + topH * 0.48, 3.4 * sy);
    ctx.save();
    ctx.fillStyle = neon2;
    ctx.shadowColor = neon2;
    ctx.shadowBlur = 8 * uiScale;
    ctx.beginPath();
    ctx.arc(up.C.x, up.C.y + topH * 0.16, 1.5 * uiScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  speaker(3.6, 0.18);
  speaker(0.18, 3.6);
}
