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
import Speaker from "./Speaker";

// How far into the floor the booth's arms reach (tile-grid j units, back-tip reference
// frame) — ClubGameInner uses this to keep dancers from wandering into it.
export const DJ_BOOTH_BACK_LIMIT = 214;

// DJ booth: an L-shaped riser hugging the two back walls, its near/tip-side corner left
// open as a floor-level recess — that open notch is the DJ's own one-tile spot, tucked
// between the two arms instead of standing on top of them. Desk sits further out on the
// solid arms, decks on the desk, with two speaker stacks flanking the whole booth.
export default function DjBooth({ g, sx, sy, uiScale, djImage, djBounce = 0 }) {
  return (
    <>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          drawDjBooth(ctx, g, sx, sy, uiScale, djImage, djBounce);
        }}
      />
      <Speaker g={g} i={3.6} j={0.18} sy={sy} />
      <Speaker g={g} i={0.18} j={3.6} sy={sy} />
    </>
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
}
