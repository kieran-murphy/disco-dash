"use client";
import { Stage, Layer, Rect, Line, Image as KonvaImage } from "react-konva";
import { useEffect, useState } from "react";

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
  const [character3aPos, setCharacter3aPos] = useState({ x: 300, y: 160 });
  const [character3bPos, setCharacter3bPos] = useState({ x: 260, y: 240 });
  const [character3cPos, setCharacter3cPos] = useState({ x: 340, y: 180 });
  
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
  const [isMoving3a, setIsMoving3a] = useState(false);
  const [isMoving3b, setIsMoving3b] = useState(false);
  const [isMoving3c, setIsMoving3c] = useState(false);
  
  const [targetPos, setTargetPos] = useState({ x: 300, y: 200 });
  const [targetPos1b, setTargetPos1b] = useState({ x: 250, y: 180 });
  const [targetPos1c, setTargetPos1c] = useState({ x: 350, y: 220 });
  const [targetPos2, setTargetPos2] = useState({ x: 280, y: 240 });
  const [targetPos2b, setTargetPos2b] = useState({ x: 320, y: 160 });
  const [targetPos2c, setTargetPos2c] = useState({ x: 240, y: 200 });
  const [targetPos2d, setTargetPos2d] = useState({ x: 360, y: 200 });
  const [targetPos3a, setTargetPos3a] = useState({ x: 300, y: 160 });
  const [targetPos3b, setTargetPos3b] = useState({ x: 260, y: 240 });
  const [targetPos3c, setTargetPos3c] = useState({ x: 340, y: 180 });
  
  const [danceTimer, setDanceTimer] = useState(0);
  const [danceTimer1b, setDanceTimer1b] = useState(0);
  const [danceTimer1c, setDanceTimer1c] = useState(0);
  const [danceTimer2, setDanceTimer2] = useState(0);
  const [danceTimer2b, setDanceTimer2b] = useState(0);
  const [danceTimer2c, setDanceTimer2c] = useState(0);
  const [danceTimer2d, setDanceTimer2d] = useState(0);
  const [danceTimer3a, setDanceTimer3a] = useState(0);
  const [danceTimer3b, setDanceTimer3b] = useState(0);
  const [danceTimer3c, setDanceTimer3c] = useState(0);

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

  // Auto movement and dancing for character1b
  useEffect(() => {
    const moveAndDance = () => {
      if (!isMoving1b) {
        setDanceTimer1b(prev => {
          const newTimer = prev + 1;
          const danceDuration = 60 + Math.random() * 60;
          
          if (newTimer >= danceDuration) {
            const centerX = 300;
            const centerY = 200 + (200 * 0.1);
            const maxWidth = 200 * 0.585;
            const maxHeight = 200 * 0.7;
            
            const margin = 20;
            const randomY = centerY - (maxHeight/2 - margin) + Math.random() * (maxHeight - margin * 2);
            const diamondWidthAtY = maxWidth * (1 - Math.abs(randomY - centerY) / (maxHeight/2));
            const randomX = centerX - (diamondWidthAtY/2 - margin) + Math.random() * (diamondWidthAtY - margin * 2);
            
            setTargetPos1b({ x: randomX, y: randomY });
            setIsMoving1b(true);
            return 0;
          }
          return newTimer;
        });
      } else {
        setCharacter1bPos(prevPos => {
          const moveSpeed = 1;
          const dx = targetPos1b.x - prevPos.x;
          const dy = targetPos1b.y - prevPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < moveSpeed) {
            setIsMoving1b(false);
            setDanceTimer1b(0);
            return targetPos1b;
          }
          
          const newX = prevPos.x + (dx / distance) * moveSpeed;
          const newY = prevPos.y + (dy / distance) * moveSpeed;
          
          return { x: newX, y: newY };
        });
      }
    };

    const interval = setInterval(moveAndDance, 50);
    return () => clearInterval(interval);
  }, [isMoving1b, targetPos1b]);




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

          {/* Character3a shadow */}
          <Rect
            x={character3aPos.x * scaleX - (14 * scaleX)}
            y={character3aPos.y * scaleY + (8 * scaleY)}
            width={28 * scaleX}
            height={16 * scaleY}
            fill="#000000"
            opacity={0.15 - (bounceOffset3a * 0.02)}
            cornerRadius={14 * scaleX}
          />
          
          {/* Sprite3a */}
          {sprite3aImage ? (
            <KonvaImage
              image={sprite3aImage}
              x={character3aPos.x * scaleX - (16 * scaleX)}
              y={(character3aPos.y + bounceOffset3a) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              opacity={1}
            />
          ) : (
            <Rect
              x={character3aPos.x * scaleX - (16 * scaleX)}
              y={(character3aPos.y + bounceOffset3a) * scaleY - (16 * scaleY)}
              width={32 * scaleX}
              height={32 * scaleY}
              fill="#8800ff"
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
