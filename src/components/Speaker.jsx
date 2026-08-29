"use client";
import { Shape } from "react-konva";
import { isoBox, isoOnFace, EQUIPMENT_BODY_COLORS, EQUIPMENT_DARK_COLORS } from "./isoDrawing";

// A two-tier speaker stack (woofer cabinet below, tweeter cabinet above) standing on the
// tile grid at (i, j). Each cone is drawn with isoOnFace directly on one of the cabinet's
// two visible faces, so it's flush with that face's iso slant instead of a flat circle
// floating over the seam between them.
export default function Speaker({ g, i, j, sy }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        drawSpeaker(ctx, g, i, j, sy);
      }}
    />
  );
}

function cone(ctx, b0, b1, h, v, r) {
  isoOnFace(ctx, b0, b1, h, 0.5, v, r, () => {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, "#07070f");
    grad.addColorStop(0.7, "#242440");
    grad.addColorStop(1, "#5a5a86");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6d6d9c";
    ctx.lineWidth = 0.1;
    ctx.stroke();
    ctx.fillStyle = "#050509";
    ctx.beginPath();
    ctx.arc(0, 0, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSpeaker(ctx, g, i, j, sy) {
  const lowH = 25 * sy;
  const topH = 16 * sy;
  const low = isoBox(ctx, g, i, j, 1.05, 1.05, lowH, EQUIPMENT_BODY_COLORS);
  const up = isoBox(ctx, g, i + 0.08, j + 0.08, 0.89, 0.89, topH, EQUIPMENT_DARK_COLORS, lowH);

  // Woofer, centered on each of the lower cabinet's two visible faces.
  cone(ctx, low.floorB, low.floorC, lowH, 0.5, 0.36);
  cone(ctx, low.floorD, low.floorC, lowH, 0.5, 0.36);

  // Tweeter on each of the upper cabinet's two visible faces.
  cone(ctx, up.floorB, up.floorC, topH, 0.5, 0.3);
  cone(ctx, up.floorD, up.floorC, topH, 0.5, 0.3);
}
