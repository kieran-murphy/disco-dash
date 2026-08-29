// Shared isometric drawing primitives for club equipment (DJ booth, bar, ...). Each piece
// of equipment is drawn with plain Canvas 2D calls inside a Konva Shape's sceneFunc, using
// these helpers to place things on the dance floor's tile grid (i = back-right axis,
// j = back-left axis, k = toward the viewer — the same axes the floor tile loop uses).
// `g` carries the diamond's top corner plus the three edge deltas (dR/dL/dB) in canvas
// pixels; see ClubGameInner's `grid` value for how it's built.

export const GRID_SCALE_FACTOR = 0.125;

export const EQUIPMENT_NEON = "#5fe3ff";
export const EQUIPMENT_NEON_2 = "#ff5fd1";
export const EQUIPMENT_BODY_COLORS = { top: "#3c3c60", right: "#1d1d36", left: "#131328", edge: "#50507a" };
export const EQUIPMENT_DARK_COLORS = { top: "#5a5a86", right: "#262643", left: "#191932", edge: "#6d6d9c" };

// Projects tile-grid coordinates to canvas space.
export function gridPt(g, i, j, k = 0) {
  return {
    x: g.top.x + g.dR.x * GRID_SCALE_FACTOR * i + g.dL.x * GRID_SCALE_FACTOR * j + g.dB.x * GRID_SCALE_FACTOR * k,
    y: g.top.y + g.dR.y * GRID_SCALE_FACTOR * i + g.dL.y * GRID_SCALE_FACTOR * j + g.dB.y * GRID_SCALE_FACTOR * k,
  };
}

export function tracePolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// An axis-aligned box standing on the tile grid, drawn as two front faces plus a top.
export function isoBox(ctx, g, i, j, wi, wj, h, colors, lift = 0) {
  const A = gridPt(g, i, j);
  const B = gridPt(g, i + wi, j);
  const C = gridPt(g, i + wi, j + wj);
  const D = gridPt(g, i, j + wj);
  const base = (p) => ({ x: p.x, y: p.y - lift });
  const cap = (p) => ({ x: p.x, y: p.y - lift - h });
  const faces = [
    { pts: [base(B), base(C), cap(C), cap(B)], fill: colors.right },
    { pts: [base(D), base(C), cap(C), cap(D)], fill: colors.left },
    { pts: [cap(A), cap(B), cap(C), cap(D)], fill: colors.top },
  ];
  faces.forEach((f) => {
    ctx.fillStyle = f.fill;
    tracePolygon(ctx, f.pts);
    ctx.fill();
    if (colors.edge) {
      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
  return { A: cap(A), B: cap(B), C: cap(C), D: cap(D), floorC: base(C), floorB: base(B), floorD: base(D) };
}

// An L-shaped prism standing on the tile grid: a `full`×`full` square footprint with its
// near (i0, j0) tip-side corner notched out instead of filled — the two `arm`-wide arms
// of equal width hug the far edges and meet at an inner elbow, leaving an open, unwalled
// recess at the tip where something can stand at floor level (pass arm = full / 2 for a
// symmetric L). Only the two outer arm-end faces are drawn; the notch's own step edges
// face away from the camera and are never visible, same as isoBox's hidden back faces.
export function isoLBox(ctx, g, i0, j0, full, arm, h, colors, lift = 0) {
  const outerCorner = gridPt(g, i0 + full, j0 + full);
  const jFar = gridPt(g, i0, j0 + full);
  const jStep = gridPt(g, i0, j0 + arm);
  const notch = gridPt(g, i0 + arm, j0 + arm);
  const iStep = gridPt(g, i0 + arm, j0);
  const iNear = gridPt(g, i0 + full, j0);

  const base = (p) => ({ x: p.x, y: p.y - lift });
  const cap = (p) => ({ x: p.x, y: p.y - lift - h });

  ctx.fillStyle = colors.top;
  tracePolygon(ctx, [outerCorner, jFar, jStep, notch, iStep, iNear].map(cap));
  ctx.fill();
  if (colors.edge) {
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const faces = [
    { from: jFar, to: outerCorner, fill: colors.left },
    { from: iNear, to: outerCorner, fill: colors.right },
  ];
  faces.forEach(({ from, to, fill }) => {
    ctx.fillStyle = fill;
    tracePolygon(ctx, [base(from), base(to), cap(to), cap(from)]);
    ctx.fill();
    if (colors.edge) {
      ctx.strokeStyle = colors.edge;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  return {
    outerCorner: cap(outerCorner),
    jFar: cap(jFar),
    jStep: cap(jStep),
    notch: cap(notch),
    iStep: cap(iStep),
    iNear: cap(iNear),
  };
}

export function neonStrip(ctx, from, to, color, width, alpha, uiScale) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width * uiScale;
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 9 * uiScale;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

// Draws a 32x32-ish staff sprite (DJ, bartender, ...) standing at a fixed grid point,
// feet anchored at `at` minus `lift`. No-ops until the image has loaded.
export function drawStaffSprite(ctx, sx, sy, image, at, lift = 0) {
  if (!image) return;
  ctx.drawImage(image, at.x - 15 * sx, at.y - lift - 30 * sy, 30 * sx, 30 * sy);
}
