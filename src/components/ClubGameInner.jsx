"use client";
import { Stage, Layer, Group, Rect, Line, Text, Image as KonvaImage } from "react-konva";
import { useEffect, useRef, useState } from "react";
import DjBooth, { DJ_BOOTH_BACK_LIMIT } from "./DjBooth";
import Bar from "./Bar";
import StatsHud from "./StatsHud";
import StartNightOverlay from "./StartNightOverlay";
import SpotifyPanel from "./SpotifyPanel";
import useSpotifyNowPlaying from "@/hooks/useSpotifyNowPlaying";

// Every roaming character is a potential customer (the DJ and bartender are staff, not
// patrons) — 10 of them, so that's the floor's capacity. They start at 0 and arrive one at a
// time up to that cap. Order here is arrival order, and doubles as the index into the
// dancer-state arrays below (position, sprite, bounce, ...) for that dancer.
const DANCER_KEYS = ["character", "character1b", "character1c", "character2", "character2b", "character2c", "character2d", "character3a", "character3b", "character3c"];
const MAX_CUSTOMERS = DANCER_KEYS.length;
const DANCER_SPRITES = ["sprite1.png", "sprite1b.png", "sprite1c.png", "sprite2.png", "sprite2b.png", "sprite2c.png", "sprite2d.png", "sprite3a.png", "sprite3b.png", "sprite3c.png"];
const DANCER_FALLBACK_COLORS = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#00ff88", "#0088ff", "#ff0088"];
// y values below DJ_BOOTH_BACK_LIMIT (214) land inside the DJ booth/bar footprint at the
// back of the floor, so every spawn (and matching initial target below) stays under it.
const DANCER_INITIAL_POSITIONS = [
  { x: 300, y: 245 },
  { x: 250, y: 265 },
  { x: 350, y: 220 },
  { x: 280, y: 240 },
  { x: 320, y: 235 },
  { x: 240, y: 260 },
  { x: 360, y: 270 },
  { x: 300, y: 225 },
  { x: 260, y: 240 },
  { x: 340, y: 255 },
];
// Staggered starting offsets so all 10 dancers don't begin their first dance cycle in lockstep.
const DANCER_DANCE_TIMER_OFFSETS = [0, 16, 32, 48, 64, 80, 96, 112, 128, 144];
// The bartender (see <Bar> below) reuses this dancer's sprite rather than loading its own copy.
const BARTENDER_DANCER_INDEX = DANCER_KEYS.indexOf("character2c");

const CUSTOMER_ARRIVAL_MIN_MS = 6000;
const CUSTOMER_ARRIVAL_MAX_MS = 12000;
const DRINK_PRICE_MIN = 12;
const DRINK_PRICE_MAX = 18;
const DRINK_TIP_MIN = 2;
const DRINK_TIP_MAX = 4;
// Realistic bar pacing: how often a given customer orders another drink, on average. The
// event loop below picks one random customer at a time and fires more often as the floor
// fills up, which keeps this per-customer average constant regardless of headcount (see the
// effect's own comment for the math) — VIP mode then speeds that up further.
const DRINK_ORDER_MIN_DELAY_MS = 20000;
const DRINK_ORDER_MAX_DELAY_MS = 40000;
const VIP_POINT_MIN_DELAY_MS = 7500;
const VIP_POINT_MAX_DELAY_MS = 15000;
const POPUP_DURATION_MS = 2800;
const POPUP_BASE_OFFSET = 55; // unscaled reference-frame px above the dancer's head the popup starts at
const POPUP_RISE = 30; // unscaled reference-frame px the popup floats up over its lifetime, on top of the base offset

const MONEY_STORAGE_KEY = "disco-dash-money";

// VIP mode: a timed burst bought with VIP points (see GOALS.md). Locked out while one is
// already active — no re-buying to extend it — and each purchase's cost scales up from the last.
const VIP_MODE_DURATION_MS = 60000;
const VIP_MODE_BASE_COST = 3;
const VIP_MODE_COST_MULTIPLIER = 1.5;
const VIP_MODE_MONEY_MULTIPLIER = 3;
const VIP_MODE_ARRIVAL_MULTIPLIER = 2;
const VIP_TAG_OFFSET_Y = 28; // unscaled reference-frame px above the dancer's head the VIP tag sits at
const VIP_GLOW_COLOR = "#ffd75f";

// Spotify's per-track tempo/energy data (Audio Features/Analysis) is gated behind manual
// approval for new apps, so this reacts to something always available instead: whether a
// track is actively playing on the logged-in user's account right now. A cruder "the music's
// on" boost rather than a real beat sync — dancers arrive a bit faster while it's true.
const SPOTIFY_ARRIVAL_MULTIPLIER = 1.25;

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
  const clampedY = Math.min(Math.max(y, Math.max(centerY - halfHeight, DJ_BOOTH_BACK_LIMIT)), centerY + halfHeight);
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
    if (randomY < DJ_BOOTH_BACK_LIMIT) continue; // don't send dancers wandering into the DJ booth
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
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Persisted across sessions so earnings survive a page reload — everything else (customers,
  // VIP points, isOpen) stays session-only, see their own comments below.
  const [money, setMoney] = useState(() => {
    const stored = Number(localStorage.getItem(MONEY_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  });
  useEffect(() => {
    localStorage.setItem(MONEY_STORAGE_KEY, String(money));
  }, [money]);

  const [vipPoints, setVipPoints] = useState(0);

  // Gates the whole economy (customer arrivals, money, VIP points) behind a "Start Night"
  // click — see <StartNightOverlay> below. Not persisted, so every fresh load starts closed.
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Customers trickle in one at a time until the floor's full — DANCER_KEYS[i] becomes
  // visible once `customers` passes i (see the dancer render map further down).
  const [customers, setCustomers] = useState(0);
  const customersRef = useRef(0);
  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  // VIP mode: buy with VIP points, see constants above. `vipModeEndTimeRef` mirrors the state
  // so the money/arrival timers (setInterval/setTimeout callbacks, not tied to render) can read
  // the live value without going stale between their own re-schedules.
  const [vipModeEndTime, setVipModeEndTime] = useState(0);
  const [vipCost, setVipCost] = useState(VIP_MODE_BASE_COST);
  const [vipDancerIndex, setVipDancerIndex] = useState(null);
  const vipModeEndTimeRef = useRef(0);
  useEffect(() => {
    vipModeEndTimeRef.current = vipModeEndTime;
  }, [vipModeEndTime]);

  // Spotify now-playing: read-only, polled elsewhere (see useSpotifyNowPlaying). Mirrored into
  // a ref for the same reason vipModeEndTime is — the arrival timer's setTimeout callback needs
  // the live value without going stale between its own re-schedules.
  const { isLoggedIn: spotifyLoggedIn, track: spotifyTrack, login: spotifyLogin, logout: spotifyLogout } = useSpotifyNowPlaying();
  const spotifyPlayingRef = useRef(false);
  useEffect(() => {
    spotifyPlayingRef.current = !!spotifyTrack?.isPlaying;
  }, [spotifyTrack]);

  useEffect(() => {
    if (!isOpen) return;
    if (customers >= MAX_CUSTOMERS) return;
    const baseDelay = CUSTOMER_ARRIVAL_MIN_MS + Math.random() * (CUSTOMER_ARRIVAL_MAX_MS - CUSTOMER_ARRIVAL_MIN_MS);
    const vipActive = vipModeEndTimeRef.current > Date.now();
    let delay = vipActive ? baseDelay / VIP_MODE_ARRIVAL_MULTIPLIER : baseDelay;
    if (spotifyPlayingRef.current) delay /= SPOTIFY_ARRIVAL_MULTIPLIER;
    const timeoutId = setTimeout(() => {
      setCustomers((prev) => Math.min(prev + 1, MAX_CUSTOMERS));
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [customers, isOpen]);

  // Per-dancer sprite images, keyed by the same index as DANCER_KEYS.
  const [dancerImages, setDancerImages] = useState(() => DANCER_KEYS.map(() => null));
  const [djImage, setDjImage] = useState(null);

  // Live, mutable per-dancer movement state (position/target/isMoving/danceTimer), updated every
  // tick by the single movement effect below. `dancerPositions` is the render-facing mirror,
  // committed once per tick; other effects (popups, VIP pick) read straight from this ref so they
  // always see the latest position without waiting on a re-render.
  const dancerStateRef = useRef(
    DANCER_KEYS.map((_, i) => ({
      pos: { ...DANCER_INITIAL_POSITIONS[i] },
      target: { ...DANCER_INITIAL_POSITIONS[i] },
      isMoving: false,
      danceTimer: DANCER_DANCE_TIMER_OFFSETS[i],
    }))
  );
  const [dancerPositions, setDancerPositions] = useState(() => DANCER_INITIAL_POSITIONS.map((p) => ({ ...p })));
  const [dancerBounce, setDancerBounce] = useState(() => DANCER_KEYS.map(() => 0));
  const [djBounce, setDjBounce] = useState(0);

  // Floating "+N" text that pops up over a random dancer whenever money or VIP points
  // increase — rendered on the canvas itself (see the Text nodes near the end of the JSX
  // below) rather than in the StatsHud overlay, so the gain reads as coming from the floor.
  const [popups, setPopups] = useState([]);
  const popupIdRef = useRef(0);

  // Only picks among customers who've actually arrived — DANCER_KEYS[0..customers) —
  // so a gain never pops up over a dancer who isn't on the floor yet.
  function pickRandomDancerPos() {
    const arrived = customersRef.current;
    if (arrived === 0) return DANCER_INITIAL_POSITIONS[0];
    const idx = Math.floor(Math.random() * arrived);
    return dancerStateRef.current[idx].pos;
  }

  function spawnPopup(text, pos, color, subtext) {
    const id = ++popupIdRef.current;
    const spawnTime = Date.now();
    setPopups((prev) => [...prev.filter((p) => spawnTime - p.spawnTime < POPUP_DURATION_MS), { id, text, subtext, x: pos.x, y: pos.y, color, spawnTime }]);
  }

  // Spends VIP points to trigger VIP mode: multipliers spike and the floor tiles go rainbow for
  // VIP_MODE_DURATION_MS. Locked out while one is already active — no re-buying to extend/stack.
  function buyVipMode() {
    if (vipModeEndTime > Date.now()) return;
    if (vipPoints < vipCost) return;
    setVipPoints((prev) => prev - vipCost);
    setVipCost((prev) => Math.round(prev * VIP_MODE_COST_MULTIPLIER));
    setVipModeEndTime(Date.now() + VIP_MODE_DURATION_MS);
    const arrived = customersRef.current;
    if (arrived > 0) {
      setVipDancerIndex(Math.floor(Math.random() * arrived));
    }
  }

  // Money comes from individual drink orders: one random customer on the floor orders a drink
  // (DRINK_PRICE_MIN-MAX) plus a tip (DRINK_TIP_MIN-MAX) at a time, picked the same way VIP
  // points are below. Each event's own delay is the per-customer average (DRINK_ORDER_MIN/MAX_
  // DELAY_MS) divided by the current headcount — with N customers, only 1/N of events land on
  // any given one of them, so dividing by N there exactly cancels out, leaving every customer's
  // own average ordering gap at DRINK_ORDER_MIN-MAX_DELAY_MS regardless of how full the floor
  // is. VIP mode speeds up ordering (same multiplier as arrivals) and multiplies the payout.
  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      const current = customersRef.current;
      if (!isOpenRef.current || current <= 0) {
        timeoutId = setTimeout(scheduleNext, 2000);
        return;
      }
      const active = vipModeEndTimeRef.current > Date.now();
      const baseDelay = (DRINK_ORDER_MIN_DELAY_MS + Math.random() * (DRINK_ORDER_MAX_DELAY_MS - DRINK_ORDER_MIN_DELAY_MS)) / current;
      const delay = active ? baseDelay / VIP_MODE_ARRIVAL_MULTIPLIER : baseDelay;
      timeoutId = setTimeout(() => {
        const drinkPrice = Math.round(DRINK_PRICE_MIN + Math.random() * (DRINK_PRICE_MAX - DRINK_PRICE_MIN));
        const tip = Math.round(DRINK_TIP_MIN + Math.random() * (DRINK_TIP_MAX - DRINK_TIP_MIN));
        const stillActive = vipModeEndTimeRef.current > Date.now();
        const amount = (drinkPrice + tip) * (stillActive ? VIP_MODE_MONEY_MULTIPLIER : 1);
        setMoney((prev) => prev + amount);
        spawnPopup(`+$${drinkPrice}`, pickRandomDancerPos(), "#5fe3ff", `+$${tip} tip`);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  // VIP points trickle in at random intervals, as if a VIP guest just tipped — a fuller
  // floor means more (and more frequent) chances for someone to tip, scaling the base
  // delay range down as customers approaches the cap. An empty floor just waits.
  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      const current = customersRef.current;
      if (!isOpenRef.current || current <= 0) {
        timeoutId = setTimeout(scheduleNext, 2000);
        return;
      }
      const speedScale = MAX_CUSTOMERS / current;
      const delay = (VIP_POINT_MIN_DELAY_MS + Math.random() * (VIP_POINT_MAX_DELAY_MS - VIP_POINT_MIN_DELAY_MS)) * speedScale;
      timeoutId = setTimeout(() => {
        setVipPoints((prev) => prev + 1);
        spawnPopup("+1 VIP", pickRandomDancerPos(), "#ff5fd1");
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  // Calculate canvas dimensions based on viewport
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load all sprite images: one per dancer (into dancerImages, indexed like DANCER_KEYS) plus
  // the DJ's. The bartender doesn't get its own load — it reuses dancerImages[BARTENDER_DANCER_INDEX].
  useEffect(() => {
    DANCER_SPRITES.forEach((filename, i) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setDancerImages((prev) => {
          const next = [...prev];
          next[i] = img;
          return next;
        });
      };
      img.onerror = (error) => {
        console.error(`Failed to load ${filename}:`, error);
      };
      img.src = `/images/${filename}`;
    });

    const djImg = new window.Image();
    djImg.crossOrigin = 'anonymous';
    djImg.onload = () => setDjImage(djImg);
    djImg.onerror = (error) => {
      console.error('Failed to load sprite3a.png:', error);
    };
    djImg.src = '/images/sprite3a.png';
  }, []);

  // Bouncing animation for all characters (dancers + DJ), each offset in phase so they don't
  // bounce in lockstep.
  useEffect(() => {
    let rafId;
    const animate = () => {
      const time = Date.now() * 0.008; // Faster, more snappy
      setDancerBounce(DANCER_KEYS.map((_, i) => Math.abs(Math.sin(time + i * 0.5)) * 1.5));
      setDjBounce(Math.abs(Math.sin(time + DANCER_KEYS.length * 0.5)) * 1.5);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Auto movement and dancing for every dancer, driven off one shared 50ms tick rather than one
  // effect per dancer. Mutates dancerStateRef in place (each dancer's move only needs everyone
  // else's latest position, which the ref always has) and commits the positions to render-facing
  // state once per tick.
  useEffect(() => {
    const interval = setInterval(() => {
      const states = dancerStateRef.current;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (!s.isMoving) {
          s.danceTimer += 1;
          // Dance for 2-10 seconds (40-200 frames at 50ms intervals)
          const danceDuration = 150 + Math.random() * 300; // 7.5-22.5s, dancing far more than moving
          if (s.danceTimer >= danceDuration) {
            const others = states.filter((_, j) => j !== i).map((o) => o.pos);
            s.target = pickNonOverlappingTarget(others);
            s.isMoving = true;
            s.danceTimer = 0;
          }
        } else {
          const moveSpeed = 0.5;
          const dx = s.target.x - s.pos.x;
          const dy = s.target.y - s.pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < moveSpeed) {
            s.pos = s.target;
            s.isMoving = false;
            s.danceTimer = 0;
          } else {
            const steppedX = s.pos.x + (dx / distance) * moveSpeed;
            const steppedY = s.pos.y + (dy / distance) * moveSpeed;
            const others = states.filter((_, j) => j !== i).map((o) => o.pos);
            s.pos = applySeparation(steppedX, steppedY, others);
          }
        }
      }
      setDancerPositions(states.map((s) => s.pos));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // character3a is the DJ: he stays put at his booth-side spot instead of roaming the floor
  // like the other dancers. He still gets the idle bounce animation above, just no walk-to-target
  // behavior — see <DjBooth> below.

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

  // Tile-grid reference frame passed to <DjBooth> / <Bar> (see isoDrawing.js's gridPt).
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

  const vipModeActive = vipModeEndTime > Date.now();
  const vipModeRemainingMs = vipModeActive ? vipModeEndTime - Date.now() : 0;

  return (
    <div className="flex flex-col items-center">
      {!isOpen && <StartNightOverlay onOpen={() => setIsOpen(true)} />}
      <SpotifyPanel isLoggedIn={spotifyLoggedIn} track={spotifyTrack} onLogin={spotifyLogin} onLogout={spotifyLogout} />
      <StatsHud
        money={money}
        customers={customers}
        vipPoints={vipPoints}
        maxCustomers={MAX_CUSTOMERS}
        vipCost={vipCost}
        vipModeActive={vipModeActive}
        vipModeRemainingMs={vipModeRemainingMs}
        onBuyVip={buyVipMode}
      />
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

          {/* Per-diamond twinkle glow overlays (staggered, more animated). During VIP mode the
              usual bluish-purple twinkle shifts into a shifting rainbow palette instead. */}
          {diamondsGrid.map((d, idx) => {
            const basePhase = rand01FromPoint(d.top) * Math.PI * 2;
            const baseSpeed = 1.2 + rand01FromPoint(d.right) * 1.5; // faster per-tile speeds
            const burstPhase = rand01FromPoint(d.bottom);
            const burstInterval = 1.2 + burstPhase * 1.8; // more frequent bursts
            const burstT = ((twinkleTime + burstPhase) % burstInterval) / burstInterval;
            const burst = Math.pow(Math.max(0, Math.cos(burstT * Math.PI * 2)), 3); // sharper peaks
            const wave = (Math.sin(twinkleTime * baseSpeed + basePhase) + 1) / 2; // 0..1
            const pulse = wave * (0.45 + 0.55 * burst); // stronger during bursts
            const opacity = vipModeActive ? 0.2 + pulse * 0.5 : 0.08 + pulse * 0.3;
            const blur = (vipModeActive ? 5.5 : 3.2) * Math.min(scaleX, scaleY) * (0.5 + pulse);
            const colorShift = 0.8 + 0.2 * rand01FromPoint(d.left);
            const hue = (twinkleTime * 70 + rand01FromPoint(d.top) * 360) % 360;
            const color = vipModeActive
              ? `hsla(${hue}, 95%, 68%, 1)`
              : `rgba(${Math.round(191*colorShift)}, ${Math.round(195*colorShift)}, 255, 1)`;
            return (
              <Line
                key={`diamond-glow-${idx}`}
                points={d.points}
                closed={true}
                fillEnabled={false}
                stroke={color}
                strokeWidth={vipModeActive ? 2.6 : 1.8}
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

          {/* DJ booth and bar, standing on the tile grid at the back — each its own component */}
          <DjBooth g={grid} sx={scaleX} sy={scaleY} uiScale={uiScale} djImage={djImage} djBounce={djBounce} />
          <Bar g={grid} sx={scaleX} sy={scaleY} uiScale={uiScale} bartenderImage={dancerImages[BARTENDER_DANCER_INDEX]} bartenderBounce={dancerBounce[BARTENDER_DANCER_INDEX]} />

          {/* All dancers on the diamond — rendered on top, data-driven off DANCER_KEYS so each
              one stays invisible (but still dancing/roaming off-screen) until its turn in arrival
              order comes up in `customers`. The one currently picked as VIP (see buyVipMode) gets
              a glow and a floating "VIP" tag for the burst's duration. */}
          {DANCER_KEYS.map((key, i) => {
            const pos = dancerPositions[i];
            const bounce = dancerBounce[i];
            const image = dancerImages[i];
            const isVip = vipModeActive && i === vipDancerIndex;
            return (
              <Group key={key} visible={customers > i}>
                {/* Shadow */}
                <Rect
                  x={pos.x * scaleX - (14 * scaleX)}
                  y={pos.y * scaleY + (8 * scaleY)}
                  width={28 * scaleX}
                  height={16 * scaleY}
                  fill="#000000"
                  opacity={0.15 - (bounce * 0.02)}
                  cornerRadius={14 * scaleX}
                />

                {image ? (
                  <KonvaImage
                    image={image}
                    x={pos.x * scaleX - (16 * scaleX)}
                    y={(pos.y + bounce) * scaleY - (16 * scaleY)}
                    width={32 * scaleX}
                    height={32 * scaleY}
                    opacity={1}
                    shadowEnabled={isVip}
                    shadowColor={VIP_GLOW_COLOR}
                    shadowBlur={isVip ? 16 * uiScale : 0}
                    shadowOpacity={isVip ? 0.9 : 0}
                  />
                ) : (
                  <Rect
                    x={pos.x * scaleX - (16 * scaleX)}
                    y={(pos.y + bounce) * scaleY - (16 * scaleY)}
                    width={32 * scaleX}
                    height={32 * scaleY}
                    fill={DANCER_FALLBACK_COLORS[i]}
                    opacity={1}
                    shadowEnabled={isVip}
                    shadowColor={VIP_GLOW_COLOR}
                    shadowBlur={isVip ? 16 * uiScale : 0}
                    shadowOpacity={isVip ? 0.9 : 0}
                  />
                )}

                {isVip && (
                  <Group listening={false}>
                    <Rect
                      x={pos.x * scaleX - (16 * scaleX)}
                      y={(pos.y - VIP_TAG_OFFSET_Y) * scaleY}
                      width={32 * scaleX}
                      height={13 * scaleY}
                      cornerRadius={3 * uiScale}
                      fill="#2b1530dd"
                      stroke={VIP_GLOW_COLOR}
                      strokeWidth={1 * uiScale}
                      shadowColor={VIP_GLOW_COLOR}
                      shadowBlur={4 * uiScale}
                    />
                    <Text
                      text="VIP"
                      x={pos.x * scaleX - (16 * scaleX)}
                      y={(pos.y - VIP_TAG_OFFSET_Y) * scaleY}
                      width={32 * scaleX}
                      height={13 * scaleY}
                      align="center"
                      verticalAlign="middle"
                      fontSize={8 * uiScale}
                      fontStyle="bold"
                      fill={VIP_GLOW_COLOR}
                    />
                  </Group>
                )}
              </Group>
            );
          })}

          {/* Money / VIP gain popups, floating up from wherever they were earned, as bare
              text with no background or border. Drink-order popups carry a `subtext`
              itemizing the drink vs. tip, rendered as a smaller second line under the total. */}
          {popups.map((p) => {
            const age = Date.now() - p.spawnTime;
            if (age > POPUP_DURATION_MS) return null;
            const t = age / POPUP_DURATION_MS;
            const textW = Math.max(12 + p.text.length * 5, p.subtext ? 12 + p.subtext.length * 4.2 : 0);
            const textH = p.subtext ? 17 : 24;
            const left = p.x - textW / 2;
            const top = p.y - POPUP_BASE_OFFSET - POPUP_RISE * t - textH / 2;
            const totalH = p.subtext ? 9 : textH;
            return (
              <Group key={p.id} opacity={1 - t} listening={false}>
                <Text
                  text={p.text}
                  x={left * scaleX}
                  y={top * scaleY}
                  width={textW * scaleX}
                  height={totalH * scaleY}
                  align="center"
                  verticalAlign="middle"
                  fontSize={7.5 * uiScale}
                  fontStyle="bold"
                  fill={p.color}
                  shadowColor="#000000"
                  shadowBlur={4 * uiScale}
                  shadowOpacity={0.8}
                />
                {p.subtext && (
                  <Text
                    text={p.subtext}
                    x={left * scaleX}
                    y={(top + totalH) * scaleY}
                    width={textW * scaleX}
                    height={(textH - totalH) * scaleY}
                    align="center"
                    verticalAlign="middle"
                    fontSize={6.5 * uiScale}
                    fill={p.color}
                    opacity={0.8}
                    shadowColor="#000000"
                    shadowBlur={3 * uiScale}
                    shadowOpacity={0.8}
                  />
                )}
              </Group>
            );
          })}

        </Layer>
      </Stage>
    </div>
  );
}
