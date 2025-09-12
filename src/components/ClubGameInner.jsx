"use client";
import { Stage, Layer, Rect, Line, Image as KonvaImage } from "react-konva";
import { useEffect, useState } from "react";

export default function ClubGameInner() {
  const [dancers, setDancers] = useState([]);
  const [lights, setLights] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [sprite1Image, setSprite1Image] = useState(null);
  const [characterPos, setCharacterPos] = useState({ x: 300, y: 200 });
  const [bounceOffset, setBounceOffset] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 });
  const [danceTimer, setDanceTimer] = useState(0);

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

  // Load sprite1 image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('Sprite1 image loaded successfully');
      setSprite1Image(img);
    };
    img.onerror = (error) => {
      console.error('Failed to load sprite1 image:', error);
    };
    img.src = '/images/sprite1.png';
  }, []);


  // Bouncing animation for character
  useEffect(() => {
    const animate = () => {
      setBounceOffset(prev => {
        const time = Date.now() * 0.008; // Faster, more snappy
        return Math.abs(Math.sin(time)) * 1.5; // Shorter bounce, more bop-like
      });
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
          // Dance for 3-6 seconds (60-120 frames at 50ms intervals)
          const danceDuration = 60 + Math.random() * 60;
          
          if (newTimer >= danceDuration) {
            // Time to move to a new location
            const centerX = 300;
            const centerY = 200 + (200 * 0.1);
            const maxWidth = 200 * 0.585;
            const maxHeight = 200 * 0.7;
            
            // Generate random position within diamond bounds (with margin for character size)
            const margin = 20; // Keep character away from edges
            const randomY = centerY - (maxHeight/2 - margin) + Math.random() * (maxHeight - margin * 2);
            const diamondWidthAtY = maxWidth * (1 - Math.abs(randomY - centerY) / (maxHeight/2));
            const randomX = centerX - (diamondWidthAtY/2 - margin) + Math.random() * (diamondWidthAtY - margin * 2);
            
            setTargetPos({ x: randomX, y: randomY });
            setIsMoving(true);
            return 0; // Reset timer
          }
          return newTimer;
        });
      } else {
        // Move towards target
        setCharacterPos(prevPos => {
          const moveSpeed = 1;
          const dx = targetPos.x - prevPos.x;
          const dy = targetPos.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < moveSpeed) {
            // Reached target, stop moving and start dancing
            setIsMoving(false);
            setDanceTimer(0); // Reset dance timer
            return targetPos;
          }
          
          // Move towards target
          const newX = prevPos.x + (dx / distance) * moveSpeed;
          const newY = prevPos.y + (dy / distance) * moveSpeed;
          
          return { x: newX, y: newY };
        });
      }
    };

    const interval = setInterval(moveAndDance, 50); // Move every 50ms
    return () => clearInterval(interval);
  }, [isMoving, targetPos]);




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

  

  const maxSteps = Math.floor(1 / scaleFactor);
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
  // Remove bottom-most row
  const maxTopY = Math.max(...tempDiamonds.map((d) => d.top.y));
  const epsilon = 0.25;
  let diamondsGrid = tempDiamonds.filter((d) => d.top.y < maxTopY - epsilon);
  // Clip to base walls
  diamondsGrid = diamondsGrid.filter((d) => isDiamondInsideBase(d));

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
              300 * scaleX - (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1) - (45 * scaleY), // left point raised with scaling (30 * 1.5 = 45)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25) - (45 * scaleY), // top point raised with scaling (30 * 1.5 = 45)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25), // top point original
              300 * scaleX - (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1)  // left point original
            ]}
            closed={true}
            fill="#111133"
            stroke="#222244"
            strokeWidth={1}
            fillLinearGradientStartPoint={{
              x: (300 * scaleX + (300 * scaleX - (200 * scaleY * 0.585))) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 - 45 * scaleY + (200 * scaleY + 200 * scaleY * 0.1 - 45 * scaleY)) / 2,
            }}
            fillLinearGradientEndPoint={{
              x: (300 * scaleX + (300 * scaleX - (200 * scaleY * 0.585))) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 + (200 * scaleY + 200 * scaleY * 0.1)) / 2,
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
              300 * scaleX - (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1) - (45 * scaleY),
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
              300 * scaleX + (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1) - (45 * scaleY), // right point raised with scaling (30 * 1.5 = 45)
              300 * scaleX + (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1), // right point original
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25)  // top point original
            ]}
            closed={true}
            fill="#111133"
            stroke="#222244"
            strokeWidth={1}
            fillLinearGradientStartPoint={{
              x: (300 * scaleX + (300 * scaleX + 200 * scaleY * 0.585)) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 - 45 * scaleY + (200 * scaleY + 200 * scaleY * 0.1 - 45 * scaleY)) / 2,
            }}
            fillLinearGradientEndPoint={{
              x: (300 * scaleX + (300 * scaleX + 200 * scaleY * 0.585)) / 2,
              y: (100 * scaleY + 200 * scaleY * 0.25 + (200 * scaleY + 200 * scaleY * 0.1)) / 2,
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
              300 * scaleX + (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1) - (45 * scaleY),
            ]}
            stroke="#aab0ff"
            strokeWidth={2 * uiScale}
            opacity={0.5}
            lineCap="round"
            shadowEnabled
            shadowColor="#aab0ff"
            shadowBlur={6 * uiScale}
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

          {/* Sprite1 image on diamond - rendered on top */}
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

        </Layer>
      </Stage>
    </div>
  );
}
