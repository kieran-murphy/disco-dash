"use client";
import { Stage, Layer, Rect, Line, Image as KonvaImage, Shape } from "react-konva";
import { useEffect, useRef, useState } from "react";

// Grid units (not canvas pixels) for the tile-projection helpers below — matches the
// scaleFactor used to build the tile diamond grid further down.
const GRID_SCALE_FACTOR = 0.125;
// Keeps dancers from wandering into the DJ booth at the back tip of the floor (reference
// frame Y, same units as characterPos etc.).
const BACK_LIMIT = 214;

const EQUIPMENT_NEON = "#5fe3ff";
const EQUIPMENT_NEON_2 = "#ff5fd1";
const EQUIPMENT_BODY_COLORS = { top: "#3c3c60", right: "#1d1d36", left: "#131328", edge: "#50507a" };
const EQUIPMENT_DARK_COLORS = { top: "#5a5a86", right: "#262643", left: "#191932", edge: "#6d6d9c" };

// Projects tile-grid coordinates (i = back-right axis, j = back-left axis, k = toward the
// viewer) to canvas space, using the same axes the tile loop below uses. `g` carries the
// diamond's top corner plus the three edge deltas (dR/dL/dB) in canvas pixels.
function gridPt(g, i, j, k = 0) {
  return {
    x: g.top.x + g.dR.x * GRID_SCALE_FACTOR * i + g.dL.x * GRID_SCALE_FACTOR * j + g.dB.x * GRID_SCALE_FACTOR * k,
    y: g.top.y + g.dR.y * GRID_SCALE_FACTOR * i + g.dL.y * GRID_SCALE_FACTOR * j + g.dB.y * GRID_SCALE_FACTOR * k,
  };
}

function tracePolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// An axis-aligned box standing on the tile grid, drawn as two front faces plus a top.
function isoBox(ctx, g, i, j, wi, wj, h, colors, lift = 0) {
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
// near (i0, i0) tip-side corner notched out instead of filled — the two `arm`-wide arms
// of equal width hug the far edges and meet at an inner elbow, leaving an open, unwalled
// recess at the tip where something can stand at floor level (pass arm = full / 2 for a
// symmetric L). Only the two outer arm-end faces are drawn; the notch's own step edges
// face away from the camera and are never visible, same as isoBox's hidden back faces.
function isoLBox(ctx, g, i0, j0, full, arm, h, colors, lift = 0) {
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

function neonStrip(ctx, from, to, color, width, alpha, uiScale) {
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

// DJ booth, speaker stacks and bar, standing on the tile grid behind the dancers' roaming
// area. The bartender is drawn between furniture layers (on the shelf before the counter)
// so the counter correctly occludes his lower body; the DJ stands clear of the desk in his
// own open recess, so no occlusion sandwiching is needed for him.
function drawClubEquipment(ctx, g, sx, sy, uiScale, djImage, bartenderImage, djBounce = 0, bartenderBounce = 0) {
  const neon = EQUIPMENT_NEON;
  const neon2 = EQUIPMENT_NEON_2;

  const staffSprite = (image, at, lift = 0) => {
    if (!image) return;
    ctx.drawImage(image, at.x - 15 * sx, at.y - lift - 30 * sy, 30 * sx, 30 * sy);
  };

  // DJ booth: an L-shaped riser hugging the two back walls, its near/tip-side corner left
  // open as a floor-level recess — that open notch is the DJ's own one-tile spot, tucked
  // between the two arms instead of standing on top of them. Desk sits further out on the
  // solid arms, decks on the desk.
  const riserH = 11 * sy;
  const riserFull = 2.8;
  const riserArm = riserFull / 2; // even sides
  const riser = isoLBox(ctx, g, 0.35, 0.35, riserFull, riserArm, riserH, EQUIPMENT_BODY_COLORS);
  neonStrip(ctx, riser.jFar, riser.outerCorner, neon, 2, 0.75, uiScale);
  neonStrip(ctx, riser.iNear, riser.outerCorner, neon, 2, 0.75, uiScale);

  // The DJ stands at floor level in the open notch (his one-tile spot) — just a gentle
  // idle bob, no walking.
  staffSprite(djImage, gridPt(g, 1.05, 1.05), djBounce * sy);

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

  // Bar along the back-right wall: bottle shelf, counter, taps and stools.
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
  staffSprite(bartenderImage, gridPt(g, 7.1, 0.68), 4 * sy + bartenderBounce * sy);

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

// Shared footprint for wherever dancers are allowed to roam: scales the original small diamond by
// the same factor the dance floor's tile grid and back walls are extended by (see maxSteps below),
// so dancers use the whole rendered floor instead of just the original small diamond.
function getRoamBounds() {
  const gridScaleFactor = 0.125;
  const gridMaxSteps = Math.floor(1 / gridScaleFactor) + 1;
  const extendedMultiplier = gridScaleFactor * (gridMaxSteps + 1);

  const topY = 100 + 200 * 0.25; // matches diamondTop's y in the unscaled 600x400 reference frame
  const centerX = 300;
  const maxWidth = 200 * 0.585 * extendedMultiplier;
  const maxHeight = 200 * 0.7 * extendedMultiplier;
  const centerY = topY + maxHeight / 2;
  const margin = 20;

  return { centerX, centerY, maxWidth, maxHeight, margin };
}

// Pulls (x, y) back inside the roaming diamond if it's drifted outside — there's no wall on the
// bottom/left/right sides the way there is at the back, so nothing else stops a dancer who's been
// pushed by applySeparation from sliding off the edge of the floor and getting stranded there.
function clampToRoamBounds(x, y) {
  const { centerX, centerY, maxWidth, maxHeight, margin } = getRoamBounds();
  const halfHeight = maxHeight / 2 - margin;
  const clampedY = Math.min(Math.max(y, Math.max(centerY - halfHeight, BACK_LIMIT)), centerY + halfHeight);
  const widthAtY = Math.max(maxWidth * (1 - Math.abs(clampedY - centerY) / (maxHeight / 2)), margin * 2);
  const halfWidth = widthAtY / 2 - margin;
  const clampedX = Math.min(Math.max(x, centerX - halfWidth), centerX + halfWidth);
  return { x: clampedX, y: clampedY };
}

// Picks a random spot on the dance floor that isn't too close to anyone in `otherPositions`.
// Stops at the first candidate that clears minDistance (rather than searching for the single best
// one) so different dancers deciding around the same time don't all converge on the same "most
// isolated" spot — that greedy-maximization approach was tried and reliably produced a single
// pileup at whichever corner was farthest from the crowd. Falls back to the roomiest, least-crowded
// candidate found if nothing clears the threshold within the attempt budget.
function pickNonOverlappingTarget(otherPositions, minDistance = 28) {
  const { centerX, centerY, maxWidth, maxHeight, margin } = getRoamBounds();

  let bestCandidate = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 20; attempt++) {
    const randomY = centerY - (maxHeight / 2 - margin) + Math.random() * (maxHeight - margin * 2);
    if (randomY < BACK_LIMIT) continue; // don't send dancers wandering into the DJ booth
    const diamondWidthAtY = maxWidth * (1 - Math.abs(randomY - centerY) / (maxHeight / 2));
    if (diamondWidthAtY < margin * 2) continue; // too narrow near the diamond's tips to place a character
    const randomX = centerX - (diamondWidthAtY / 2 - margin) + Math.random() * (diamondWidthAtY - margin * 2);

    const minDist = otherPositions.length === 0
      ? Infinity
      : Math.min(...otherPositions.map((p) => Math.hypot(p.x - randomX, p.y - randomY)));

    if (minDist >= minDistance) {
      return { x: randomX, y: randomY };
    }
    if (minDist > bestScore) {
      bestScore = minDist;
      bestCandidate = { x: randomX, y: randomY };
    }
  }

  if (!bestCandidate) {
    return { x: centerX, y: centerY };
  }

  return bestCandidate;
}

// Nudges (x, y) away from any position in `otherPositions` that's closer than minSeparation,
// applied every movement tick so dancers deflect off each other mid-transit instead of walking
// straight through — a soft "bounce" rather than a hard collision. The total nudge is capped so a
// crowd of close neighbors can't overpower the walk toward the target, and the result is clamped
// back onto the floor so repeated nudges can't push a dancer off the edge and strand them there.
function applySeparation(x, y, otherPositions, minSeparation = 30) {
  let pushX = 0;
  let pushY = 0;
  for (const other of otherPositions) {
    const dx = x - other.x;
    const dy = y - other.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001 && dist < minSeparation) {
      const strength = (minSeparation - dist) / minSeparation;
      pushX += (dx / dist) * strength;
      pushY += (dy / dist) * strength;
    }
  }

  const pushMag = Math.hypot(pushX, pushY);
  const maxPush = 1;
  if (pushMag > maxPush) {
    pushX = (pushX / pushMag) * maxPush;
    pushY = (pushY / pushMag) * maxPush;
  }

  return clampToRoamBounds(x + pushX, y + pushY);
}

export default function ClubGameInner() {
  const [dancers, setDancers] = useState([]);
  const [lights, setLights] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [sprite1Image, setSprite1Image] = useState(null);
  const [sprite1bImage, setSprite1bImage] = useState(null);
  const [sprite1cImage, setSprite1cImage] = useState(null);
  const [sprite2Image, setSprite2Image] = useState(null);
  const [sprite2bImage, setSprite2bImage] = useState(null);
  const [sprite2cImage, setSprite2cImage] = useState(null);
  const [sprite2dImage, setSprite2dImage] = useState(null);
  const [sprite3aImage, setSprite3aImage] = useState(null);
  const [sprite3bImage, setSprite3bImage] = useState(null);
  const [sprite3cImage, setSprite3cImage] = useState(null);
  
  const [characterPos, setCharacterPos] = useState({ x: 300, y: 200 });
  const [character1bPos, setCharacter1bPos] = useState({ x: 250, y: 180 });
  const [character1cPos, setCharacter1cPos] = useState({ x: 350, y: 220 });
  const [character2Pos, setCharacter2Pos] = useState({ x: 280, y: 240 });
  const [character2bPos, setCharacter2bPos] = useState({ x: 320, y: 160 });
  const [character2cPos, setCharacter2cPos] = useState({ x: 240, y: 200 });
  const [character2dPos, setCharacter2dPos] = useState({ x: 360, y: 200 });
  const [character3bPos, setCharacter3bPos] = useState({ x: 260, y: 240 });
  const [character3cPos, setCharacter3cPos] = useState({ x: 340, y: 180 });

  // Live mirror of every dancer's position, kept in a ref so any dancer's movement effect
  // can read everyone else's current spot without going stale between its own re-runs.
  const positionsRef = useRef({});
  useEffect(() => {
    positionsRef.current = {
      character: characterPos,
      character1b: character1bPos,
      character1c: character1cPos,
      character2: character2Pos,
      character2b: character2bPos,
      character2c: character2cPos,
      character2d: character2dPos,
      character3b: character3bPos,
      character3c: character3cPos,
    };
  }, [characterPos, character1bPos, character1cPos, character2Pos, character2bPos, character2cPos, character2dPos, character3bPos, character3cPos]);

  const [bounceOffset, setBounceOffset] = useState(0);
  const [bounceOffset1b, setBounceOffset1b] = useState(0);
  const [bounceOffset1c, setBounceOffset1c] = useState(0);
  const [bounceOffset2, setBounceOffset2] = useState(0);
  const [bounceOffset2b, setBounceOffset2b] = useState(0);
  const [bounceOffset2c, setBounceOffset2c] = useState(0);
  const [bounceOffset2d, setBounceOffset2d] = useState(0);
  const [bounceOffset3a, setBounceOffset3a] = useState(0);
  const [bounceOffset3b, setBounceOffset3b] = useState(0);
  const [bounceOffset3c, setBounceOffset3c] = useState(0);
  
  const [isMoving, setIsMoving] = useState(false);
  const [isMoving1b, setIsMoving1b] = useState(false);
  const [isMoving1c, setIsMoving1c] = useState(false);
  const [isMoving2, setIsMoving2] = useState(false);
  const [isMoving2b, setIsMoving2b] = useState(false);
  const [isMoving2c, setIsMoving2c] = useState(false);
  const [isMoving2d, setIsMoving2d] = useState(false);
  const [isMoving3b, setIsMoving3b] = useState(false);
  const [isMoving3c, setIsMoving3c] = useState(false);
  
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 });
  const [targetPos1b, setTargetPos1b] = useState({ x: 250, y: 180 });
  const [targetPos1c, setTargetPos1c] = useState({ x: 350, y: 220 });
  const [targetPos2, setTargetPos2] = useState({ x: 280, y: 240 });
  const [targetPos2b, setTargetPos2b] = useState({ x: 320, y: 160 });
  const [targetPos2c, setTargetPos2c] = useState({ x: 240, y: 200 });
  const [targetPos2d, setTargetPos2d] = useState({ x: 360, y: 200 });
  const [targetPos3b, setTargetPos3b] = useState({ x: 260, y: 240 });
  const [targetPos3c, setTargetPos3c] = useState({ x: 340, y: 180 });
  
  // Staggered starting offsets so all 10 dancers don't begin their first dance cycle in lockstep.
  const [danceTimer, setDanceTimer] = useState(0);
  const [danceTimer1b, setDanceTimer1b] = useState(16);
  const [danceTimer1c, setDanceTimer1c] = useState(32);
  const [danceTimer2, setDanceTimer2] = useState(48);
  const [danceTimer2b, setDanceTimer2b] = useState(64);
  const [danceTimer2c, setDanceTimer2c] = useState(80);
  const [danceTimer2d, setDanceTimer2d] = useState(96);
  const [danceTimer3b, setDanceTimer3b] = useState(128);
  const [danceTimer3c, setDanceTimer3c] = useState(144);

  // Calculate canvas dimensions based on viewport
  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.floor(window.innerWidth * 0.8);
      const height = Math.floor(window.innerHeight * 0.8);
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load all sprite images
  useEffect(() => {
    // Load sprite1
    const img1 = new window.Image();
    img1.crossOrigin = 'anonymous';
    img1.onload = () => {
      console.log('Sprite1 image loaded successfully');
      setSprite1Image(img1);
    };
    img1.onerror = (error) => {
      console.error('Failed to load sprite1 image:', error);
    };
    img1.src = '/images/sprite1.png';

    // Load sprite1b
    const img1b = new window.Image();
    img1b.crossOrigin = 'anonymous';
    img1b.onload = () => {
      console.log('Sprite1b image loaded successfully');
      setSprite1bImage(img1b);
    };
    img1b.onerror = (error) => {
      console.error('Failed to load sprite1b image:', error);
    };
    img1b.src = '/images/sprite1b.png';

    // Load sprite1c
    const img1c = new window.Image();
    img1c.crossOrigin = 'anonymous';
    img1c.onload = () => {
      console.log('Sprite1c image loaded successfully');
      setSprite1cImage(img1c);
    };
    img1c.onerror = (error) => {
      console.error('Failed to load sprite1c image:', error);
    };
    img1c.src = '/images/sprite1c.png';

    // Load sprite2
    const img2 = new window.Image();
    img2.crossOrigin = 'anonymous';
    img2.onload = () => {
      console.log('Sprite2 image loaded successfully');
      setSprite2Image(img2);
    };
    img2.onerror = (error) => {
      console.error('Failed to load sprite2 image:', error);
    };
    img2.src = '/images/sprite2.png';

    // Load sprite2b
    const img2b = new window.Image();
    img2b.crossOrigin = 'anonymous';
    img2b.onload = () => {
      console.log('Sprite2b image loaded successfully');
      setSprite2bImage(img2b);
    };
    img2b.onerror = (error) => {
      console.error('Failed to load sprite2b image:', error);
    };
    img2b.src = '/images/sprite2b.png';

    // Load sprite2c
    const img2c = new window.Image();
    img2c.crossOrigin = 'anonymous';
    img2c.onload = () => {
      console.log('Sprite2c image loaded successfully');
      setSprite2cImage(img2c);
    };
    img2c.onerror = (error) => {
      console.error('Failed to load sprite2c image:', error);
    };
    img2c.src = '/images/sprite2c.png';

    // Load sprite2d
    const img2d = new window.Image();
    img2d.crossOrigin = 'anonymous';
    img2d.onload = () => {
      console.log('Sprite2d image loaded successfully');
      setSprite2dImage(img2d);
    };
    img2d.onerror = (error) => {
      console.error('Failed to load sprite2d image:', error);
    };
    img2d.src = '/images/sprite2d.png';

    // Load sprite3a
    const img3a = new window.Image();
    img3a.crossOrigin = 'anonymous';
    img3a.onload = () => {
      console.log('Sprite3a image loaded successfully');
      setSprite3aImage(img3a);
    };
    img3a.onerror = (error) => {
      console.error('Failed to load sprite3a image:', error);
    };
    img3a.src = '/images/sprite3a.png';

    // Load sprite3b
    const img3b = new window.Image();
    img3b.crossOrigin = 'anonymous';
    img3b.onload = () => {
      console.log('Sprite3b image loaded successfully');
      setSprite3bImage(img3b);
    };
    img3b.onerror = (error) => {
      console.error('Failed to load sprite3b image:', error);
    };
    img3b.src = '/images/sprite3b.png';

    // Load sprite3c
    const img3c = new window.Image();
    img3c.crossOrigin = 'anonymous';
    img3c.onload = () => {
      console.log('Sprite3c image loaded successfully');
      setSprite3cImage(img3c);
    };
    img3c.onerror = (error) => {
      console.error('Failed to load sprite3c image:', error);
    };
    img3c.src = '/images/sprite3c.png';
  }, []);


  // Bouncing animation for all characters
  useEffect(() => {
    const animate = () => {
      const time = Date.now() * 0.008; // Faster, more snappy
      
      setBounceOffset(Math.abs(Math.sin(time)) * 1.5);
      setBounceOffset1b(Math.abs(Math.sin(time + 0.5)) * 1.5);
      setBounceOffset1c(Math.abs(Math.sin(time + 1.0)) * 1.5);
      setBounceOffset2(Math.abs(Math.sin(time + 1.5)) * 1.5);
      setBounceOffset2b(Math.abs(Math.sin(time + 2.0)) * 1.5);
      setBounceOffset2c(Math.abs(Math.sin(time + 2.5)) * 1.5);
      setBounceOffset2d(Math.abs(Math.sin(time + 3.0)) * 1.5);
      setBounceOffset3a(Math.abs(Math.sin(time + 3.5)) * 1.5);
      setBounceOffset3b(Math.abs(Math.sin(time + 4.0)) * 1.5);
      setBounceOffset3c(Math.abs(Math.sin(time + 4.5)) * 1.5);
      
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // Auto movement and dancing
  useEffect(() => {
    const moveAndDance = () => {
      // If not moving, check if we should start moving to a new location
      if (!isMoving) {
        setDanceTimer(prev => {
          const newTimer = prev + 1;
          // Dance for 2-10 seconds (40-200 frames at 50ms intervals)
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving

          if (newTimer >= danceDuration) {
            // Pick a spot away from where the other dancers currently are
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character')
              .map(([, pos]) => pos);
            setTargetPos(pickNonOverlappingTarget(others));
            setIsMoving(true);
            return 0; // Reset timer
          }
          return newTimer;
        });
      } else {
        // Move towards target
        setCharacterPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos.x - prevPos.x;
          const dy = targetPos.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            // Reached target, stop moving and start dancing
            setIsMoving(false);
            setDanceTimer(0); // Reset dance timer
            return targetPos;
          }

          // Move towards target, then deflect off anyone we're brushing past
          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50); // Move every 50ms
    return () => clearInterval(interval);
  }, [isMoving, targetPos]);

  // Auto movement and dancing for character1b
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving1b) {
        setDanceTimer1b(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time
          
          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character1b')
              .map(([, pos]) => pos);
            setTargetPos1b(pickNonOverlappingTarget(others));
            setIsMoving1b(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter1bPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos1b.x - prevPos.x;
          const dy = targetPos1b.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving1b(false);
            setDanceTimer1b(0);
            return targetPos1b;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character1b')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving1b, targetPos1b]);

  // Auto movement and dancing for character1c
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving1c) {
        setDanceTimer1c(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character1c')
              .map(([, pos]) => pos);
            setTargetPos1c(pickNonOverlappingTarget(others));
            setIsMoving1c(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter1cPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos1c.x - prevPos.x;
          const dy = targetPos1c.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving1c(false);
            setDanceTimer1c(0);
            return targetPos1c;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character1c')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving1c, targetPos1c]);

  // Auto movement and dancing for character2
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving2) {
        setDanceTimer2(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character2')
              .map(([, pos]) => pos);
            setTargetPos2(pickNonOverlappingTarget(others));
            setIsMoving2(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter2Pos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos2.x - prevPos.x;
          const dy = targetPos2.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving2(false);
            setDanceTimer2(0);
            return targetPos2;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character2')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving2, targetPos2]);

  // Auto movement and dancing for character2b
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving2b) {
        setDanceTimer2b(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character2b')
              .map(([, pos]) => pos);
            setTargetPos2b(pickNonOverlappingTarget(others));
            setIsMoving2b(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter2bPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos2b.x - prevPos.x;
          const dy = targetPos2b.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving2b(false);
            setDanceTimer2b(0);
            return targetPos2b;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character2b')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving2b, targetPos2b]);

  // Auto movement and dancing for character2c
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving2c) {
        setDanceTimer2c(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character2c')
              .map(([, pos]) => pos);
            setTargetPos2c(pickNonOverlappingTarget(others));
            setIsMoving2c(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter2cPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos2c.x - prevPos.x;
          const dy = targetPos2c.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving2c(false);
            setDanceTimer2c(0);
            return targetPos2c;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character2c')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving2c, targetPos2c]);

  // Auto movement and dancing for character2d
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving2d) {
        setDanceTimer2d(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character2d')
              .map(([, pos]) => pos);
            setTargetPos2d(pickNonOverlappingTarget(others));
            setIsMoving2d(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter2dPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos2d.x - prevPos.x;
          const dy = targetPos2d.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving2d(false);
            setDanceTimer2d(0);
            return targetPos2d;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character2d')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving2d, targetPos2d]);

  // character3a is the DJ: he stays put at his booth-side spot (set once via
  // useState above) instead of roaming the floor like the other dancers. He still
  // gets the idle bounce animation below, just no walk-to-target behavior.

  // Auto movement and dancing for character3b
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving3b) {
        setDanceTimer3b(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character3b')
              .map(([, pos]) => pos);
            setTargetPos3b(pickNonOverlappingTarget(others));
            setIsMoving3b(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter3bPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos3b.x - prevPos.x;
          const dy = targetPos3b.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving3b(false);
            setDanceTimer3b(0);
            return targetPos3b;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character3b')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving3b, targetPos3b]);

  // Auto movement and dancing for character3c
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving3c) {
        setDanceTimer3c(prev => {
          const newTimer = prev + 1;
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving // 2-10s, wide range so dancers desync over time

          if (newTimer >= danceDuration) {
            const others = Object.entries(positionsRef.current)
              .filter(([key]) => key !== 'character3c')
              .map(([, pos]) => pos);
            setTargetPos3c(pickNonOverlappingTarget(others));
            setIsMoving3c(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter3cPos(prevPos => {
          const moveSpeed = 0.5;
          const dx = targetPos3c.x - prevPos.x;
          const dy = targetPos3c.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            setIsMoving3c(false);
            setDanceTimer3c(0);
            return targetPos3c;
          }

          const steppedX = prevPos.x + (dx / distance) * moveSpeed;
          const steppedY = prevPos.y + (dy / distance) * moveSpeed;
          const others = Object.entries(positionsRef.current)
            .filter(([key]) => key !== 'character3c')
            .map(([, pos]) => pos);
          return applySeparation(steppedX, steppedY, others);
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving3c, targetPos3c]);


  // Calculate proportional positions based on canvas size
  const scaleX = dimensions.width / 600;
  const scaleY = dimensions.height / 400;
  const uiScale = Math.min(scaleX, scaleY);

  // Diamond geometry (reused for fill and clipping)
  const diamondTop = {
    x: 300 * scaleX,
    y: 100 * scaleY + 200 * scaleY * 0.25,
  };
  const diamondRight = {
    x: 300 * scaleX + 200 * scaleY * 0.585,
    y: 200 * scaleY + 200 * scaleY * 0.1,
  };
  const diamondBottom = {
    x: 300 * scaleX,
    y: 100 * scaleY + 200 * scaleY * 0.95,
  };
  const diamondLeft = {
    x: 300 * scaleX - 200 * scaleY * 0.585,
    y: 200 * scaleY + 200 * scaleY * 0.1,
  };
  const diamondPoints = [
    diamondTop.x,
    diamondTop.y,
    diamondRight.x,
    diamondRight.y,
    diamondBottom.x,
    diamondBottom.y,
    diamondLeft.x,
    diamondLeft.y,
    diamondTop.x,
    diamondTop.y,
  ];

  // Build smaller diamonds grid (pre-shine version)
  // Use the large diamond as base polygon
  const baseRight = { ...diamondRight };
  const baseBottom = { ...diamondBottom };
  const baseLeft = { ...diamondLeft };
  const basePolygon = [diamondTop, baseRight, baseBottom, baseLeft];

  // Scale factor for small diamonds
  const scaleFactor = 0.125;
  const baseRightDelta = { x: baseRight.x - diamondTop.x, y: baseRight.y - diamondTop.y };
  const baseBottomDelta = { x: baseBottom.x - diamondTop.x, y: baseBottom.y - diamondTop.y };
  const baseLeftDelta = { x: baseLeft.x - diamondTop.x, y: baseLeft.y - diamondTop.y };

  // Tile-grid reference frame for the DJ booth / bar equipment (see gridPt/isoBox above).
  const grid = { top: diamondTop, dR: baseRightDelta, dB: baseBottomDelta, dL: baseLeftDelta };

  const computeDiamondFromTop = (topPoint) => {
    const r = { x: topPoint.x + baseRightDelta.x * scaleFactor, y: topPoint.y + baseRightDelta.y * scaleFactor };
    const b = { x: topPoint.x + baseBottomDelta.x * scaleFactor, y: topPoint.y + baseBottomDelta.y * scaleFactor };
    const l = { x: topPoint.x + baseLeftDelta.x * scaleFactor, y: topPoint.y + baseLeftDelta.y * scaleFactor };
    return {
      top: topPoint,
      right: r,
      bottom: b,
      left: l,
      points: [topPoint.x, topPoint.y, r.x, r.y, b.x, b.y, l.x, l.y, topPoint.x, topPoint.y],
    };
  };

  function isPointInConvexPolygon(point, polygon) {
    const epsilon = 1e-6;
    let sign = 0;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const apx = point.x - a.x;
      const apy = point.y - a.y;
      const cross = abx * apy - aby * apx;
      if (Math.abs(cross) <= epsilon) continue;
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) sign = currentSign;
      else if (currentSign !== sign) return false;
    }
    return true;
  }

  function isDiamondInsideBase(diamond) {
    return [diamond.top, diamond.right, diamond.bottom, diamond.left].every((p) => isPointInConvexPolygon(p, basePolygon));
  }

  // Per-diamond twinkle timing
  const [twinkleTime, setTwinkleTime] = useState(0);
  useEffect(() => {
    let rafId;
    let last = performance.now();
    const loop = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setTwinkleTime((t) => t + dt);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function rand01FromPoint(p) {
    const v = Math.sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  

  const maxSteps = Math.floor(1 / scaleFactor) + 1; // Add more steps for significantly extended grid
  const tempDiamonds = [];
  for (let k = 0; k <= maxSteps; k++) {
    for (let i = 0; i <= maxSteps - k; i++) {
      for (let j = 0; j <= maxSteps - k - i; j++) {
        const topPoint = {
          x:
            diamondTop.x +
            baseRightDelta.x * scaleFactor * i +
            baseLeftDelta.x * scaleFactor * j +
            baseBottomDelta.x * scaleFactor * k,
          y:
            diamondTop.y +
            baseRightDelta.y * scaleFactor * i +
            baseLeftDelta.y * scaleFactor * j +
            baseBottomDelta.y * scaleFactor * k,
        };
        tempDiamonds.push(computeDiamondFromTop(topPoint));
      }
    }
  }
  // Include many more rows for extended dance floor
  const maxTopY = Math.max(...tempDiamonds.map((d) => d.top.y));
  const epsilon = 0.25;
  // Include many more diamonds by being much less restrictive
  let diamondsGrid = tempDiamonds.filter((d) => d.top.y < maxTopY + (epsilon * 5));
  // Don't clip to base walls - include all diamonds for maximum coverage
  // diamondsGrid = diamondsGrid.filter((d) => isDiamondInsideBase(d));

  // Outer corners of the extended dance floor (farthest tile edge along each wall direction),
  // so the back walls reach the true edges of the rendered floor instead of the original small diamond.
  const extendedMultiplier = scaleFactor * (maxSteps + 1);
  const farRight = {
    x: diamondTop.x + baseRightDelta.x * extendedMultiplier,
    y: diamondTop.y + baseRightDelta.y * extendedMultiplier,
  };
  const farLeft = {
    x: diamondTop.x + baseLeftDelta.x * extendedMultiplier,
    y: diamondTop.y + baseLeftDelta.y * extendedMultiplier,
  };

  return (
    <div className="flex flex-col items-center">
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {/* Dance floor */}
          <Rect
            x={dimensions.width * 0.05}
            y={dimensions.height * 0.05}
            width={dimensions.width * 0.9}
            height={dimensions.height * 0.9}
            fill="#222244"
            cornerRadius={10}
          />


          {/* Diamond shape in center of dance floor */}
          <Line
            points={diamondPoints}
            closed={true}
            fill="#444466"
            stroke="#555577"
            strokeWidth={2}
          />


          {/* Smaller diamonds grid (pre-shine) */}
          {diamondsGrid.map((d, idx) => (
            <Line
              key={`diamond-${idx}`}
              points={d.points}
              closed={true}
              fill="#444466"
              stroke="#555577"
              strokeWidth={2}
            />
          ))}

          {/* Per-diamond twinkle glow overlays (staggered, more animated) */}
          {diamondsGrid.map((d, idx) => {
            const basePhase = rand01FromPoint(d.top) * Math.PI * 2;
            const baseSpeed = 1.2 + rand01FromPoint(d.right) * 1.5; // faster per-tile speeds
            const burstPhase = rand01FromPoint(d.bottom);
            const burstInterval = 1.2 + burstPhase * 1.8; // more frequent bursts
            const burstT = ((twinkleTime + burstPhase) % burstInterval) / burstInterval;
            const burst = Math.pow(Math.max(0, Math.cos(burstT * Math.PI * 2)), 3); // sharper peaks
            const wave = (Math.sin(twinkleTime * baseSpeed + basePhase) + 1) / 2; // 0..1
            const pulse = wave * (0.45 + 0.55 * burst); // stronger during bursts
            const opacity = 0.08 + pulse * 0.3;
            const blur = 3.2 * Math.min(scaleX, scaleY) * (0.5 + pulse);
            const colorShift = 0.8 + 0.2 * rand01FromPoint(d.left);
            const color = `rgba(${Math.round(191*colorShift)}, ${Math.round(195*colorShift)}, 255, 1)`;
            return (
              <Line
                key={`diamond-glow-${idx}`}
                points={d.points}
                closed={true}
                fillEnabled={false}
                stroke={color}
                strokeWidth={1.8}
                opacity={opacity}
                shadowEnabled
                shadowColor={color}
                shadowBlur={blur}
              />
            );
          })}

          

          {/* Grid removed */}

          {/* Top left wall of diamond */}
          <Line
            points={[
              farLeft.x, farLeft.y - (45 * scaleY), // left point raised with scaling (30 * 1.5 = 45)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25) - (45 * scaleY), // top point raised with scaling (30 * 1.5 = 45)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25), // top point original
              farLeft.x, farLeft.y  // left point original
            ]}
            closed={true}
            fill="#111133"
            stroke="#222244"
            strokeWidth={1}
            fillLinearGradientStartPoint={{
              x: (300 * scaleX + farLeft.x) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 - 45 * scaleY + (farLeft.y - 45 * scaleY)) / 2,
            }}
            fillLinearGradientEndPoint={{
              x: (300 * scaleX + farLeft.x) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 + farLeft.y) / 2,
            }}
            fillLinearGradientColorStops={[0, '#2a2a5a', 0.5, '#15153d', 1, '#0a0a27']}
            shadowEnabled
            shadowColor="#00051a"
            shadowOpacity={0.6}
            shadowBlur={18 * uiScale}
            shadowOffset={{ x: 0, y: 6 * uiScale }}
          />
          {/* Top edge highlight - left wall */}
          <Line
            points={[
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25) - (45 * scaleY),
              farLeft.x, farLeft.y - (45 * scaleY),
            ]}
            stroke="#aab0ff"
            strokeWidth={2 * uiScale}
            opacity={0.5}
            lineCap="round"
            shadowEnabled
            shadowColor="#aab0ff"
            shadowBlur={6 * uiScale}
          />

          {/* Top right wall of diamond */}
          <Line
            points={[
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25) - (45 * scaleY), // top point raised with scaling (30 * 1.5 = 45)
              farRight.x, farRight.y - (45 * scaleY), // right point raised with scaling (30 * 1.5 = 45)
              farRight.x, farRight.y, // right point original
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25)  // top point original
            ]}
            closed={true}
            fill="#111133"
            stroke="#222244"
            strokeWidth={1}
            fillLinearGradientStartPoint={{
              x: (300 * scaleX + farRight.x) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 - 45 * scaleY + (farRight.y - 45 * scaleY)) / 2,
            }}
            fillLinearGradientEndPoint={{
              x: (300 * scaleX + farRight.x) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 + farRight.y) / 2,
            }}
            fillLinearGradientColorStops={[0, '#2a2a5a', 0.5, '#15153d', 1, '#0a0a27']}
            shadowEnabled
            shadowColor="#00051a"
            shadowOpacity={0.6}
            shadowBlur={18 * uiScale}
            shadowOffset={{ x: 0, y: 6 * uiScale }}
          />
          {/* Top edge highlight - right wall */}
          <Line
            points={[
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25) - (45 * scaleY),
              farRight.x, farRight.y - (45 * scaleY),
            ]}
            stroke="#aab0ff"
            strokeWidth={2 * uiScale}
            opacity={0.5}
            lineCap="round"
            shadowEnabled
            shadowColor="#aab0ff"
            shadowBlur={6 * uiScale}
          />

          {/* DJ booth, speaker stacks and bar, standing on the tile grid at the back */}
          <Shape
            listening={false}
            sceneFunc={(ctx) => {
              drawClubEquipment(ctx, grid, scaleX, scaleY, uiScale, sprite3aImage, sprite2cImage, bounceOffset3a, bounceOffset2c);
            }}
          />

          {/* Character shadow */}
          <Rect
            x={characterPos.x * scaleX - (14 * scaleX)}
            y={characterPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset * 0.02)}
            cornerRadius={14 * scaleX}
          />

          {/* All characters on diamond - rendered on top */}
          
          {/* Character shadow */}
          <Rect
            x={characterPos.x * scaleX - (14 * scaleX)}
            y={characterPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite1 */}
          {sprite1Image ? (
            <KonvaImage
              image={sprite1Image}
              x={characterPos.x * scaleX - (16 * scaleX)}
              y={(characterPos.y + bounceOffset) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={characterPos.x * scaleX - (16 * scaleX)}
              y={(characterPos.y + bounceOffset) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#ff0000"
              opacity={1}
            />
          )}

          {/* Character1b shadow */}
          <Rect
            x={character1bPos.x * scaleX - (14 * scaleX)}
            y={character1bPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset1b * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite1b */}
          {sprite1bImage ? (
            <KonvaImage
              image={sprite1bImage}
              x={character1bPos.x * scaleX - (16 * scaleX)}
              y={(character1bPos.y + bounceOffset1b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character1bPos.x * scaleX - (16 * scaleX)}
              y={(character1bPos.y + bounceOffset1b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#00ff00"
              opacity={1}
            />
          )}

          {/* Character1c shadow */}
          <Rect
            x={character1cPos.x * scaleX - (14 * scaleX)}
            y={character1cPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset1c * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite1c */}
          {sprite1cImage ? (
            <KonvaImage
              image={sprite1cImage}
              x={character1cPos.x * scaleX - (16 * scaleX)}
              y={(character1cPos.y + bounceOffset1c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character1cPos.x * scaleX - (16 * scaleX)}
              y={(character1cPos.y + bounceOffset1c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#0000ff"
              opacity={1}
            />
          )}

          {/* Character2 shadow */}
          <Rect
            x={character2Pos.x * scaleX - (14 * scaleX)}
            y={character2Pos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset2 * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite2 */}
          {sprite2Image ? (
            <KonvaImage
              image={sprite2Image}
              x={character2Pos.x * scaleX - (16 * scaleX)}
              y={(character2Pos.y + bounceOffset2) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character2Pos.x * scaleX - (16 * scaleX)}
              y={(character2Pos.y + bounceOffset2) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#ffff00"
              opacity={1}
            />
          )}

          {/* Character2b shadow */}
          <Rect
            x={character2bPos.x * scaleX - (14 * scaleX)}
            y={character2bPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset2b * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite2b */}
          {sprite2bImage ? (
            <KonvaImage
              image={sprite2bImage}
              x={character2bPos.x * scaleX - (16 * scaleX)}
              y={(character2bPos.y + bounceOffset2b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character2bPos.x * scaleX - (16 * scaleX)}
              y={(character2bPos.y + bounceOffset2b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#ff00ff"
              opacity={1}
            />
          )}

          {/* Character2c shadow */}
          <Rect
            x={character2cPos.x * scaleX - (14 * scaleX)}
            y={character2cPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset2c * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite2c */}
          {sprite2cImage ? (
            <KonvaImage
              image={sprite2cImage}
              x={character2cPos.x * scaleX - (16 * scaleX)}
              y={(character2cPos.y + bounceOffset2c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character2cPos.x * scaleX - (16 * scaleX)}
              y={(character2cPos.y + bounceOffset2c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#00ffff"
              opacity={1}
            />
          )}

          {/* Character2d shadow */}
          <Rect
            x={character2dPos.x * scaleX - (14 * scaleX)}
            y={character2dPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset2d * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite2d */}
          {sprite2dImage ? (
            <KonvaImage
              image={sprite2dImage}
              x={character2dPos.x * scaleX - (16 * scaleX)}
              y={(character2dPos.y + bounceOffset2d) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character2dPos.x * scaleX - (16 * scaleX)}
              y={(character2dPos.y + bounceOffset2d) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#ff8800"
              opacity={1}
            />
          )}

          {/* Character3b shadow */}
          <Rect
            x={character3bPos.x * scaleX - (14 * scaleX)}
            y={character3bPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset3b * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite3b */}
          {sprite3bImage ? (
            <KonvaImage
              image={sprite3bImage}
              x={character3bPos.x * scaleX - (16 * scaleX)}
              y={(character3bPos.y + bounceOffset3b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character3bPos.x * scaleX - (16 * scaleX)}
              y={(character3bPos.y + bounceOffset3b) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#0088ff"
              opacity={1}
            />
          )}

          {/* Character3c shadow */}
          <Rect
            x={character3cPos.x * scaleX - (14 * scaleX)}
            y={character3cPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset3c * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite3c */}
          {sprite3cImage ? (
            <KonvaImage
              image={sprite3cImage}
              x={character3cPos.x * scaleX - (16 * scaleX)}
              y={(character3cPos.y + bounceOffset3c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character3cPos.x * scaleX - (16 * scaleX)}
              y={(character3cPos.y + bounceOffset3c) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#ff0088"
              opacity={1}
            />
          )}

        </Layer>
      </Stage>
    </div>
  );
}
