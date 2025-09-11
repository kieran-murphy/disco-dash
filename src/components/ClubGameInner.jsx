"use client";
import { Stage, Layer, Rect, Circle, Text, Line } from "react-konva";
import { useEffect, useState } from "react";

export default function ClubGameInner() {
  const [dancers, setDancers] = useState([]);
  const [lights, setLights] = useState([]);
  const [score, setScore] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

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




  // Calculate proportional positions based on canvas size
  const scaleX = dimensions.width / 600;
  const scaleY = dimensions.height / 400;

  return (
    <div className="flex flex-col items-center">
      <TextScore score={score} />
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {/* Dance floor */}
          <Rect
            x={100 * scaleX}
            y={100 * scaleY}
            width={400 * scaleX}
            height={200 * scaleY}
            fill="#222244"
            cornerRadius={10}
          />

          {/* DJ booth */}
          <Rect
            x={250 * scaleX}
            y={50 * scaleY}
            width={100 * scaleX}
            height={40 * scaleY}
            fill="#aa4444"
            cornerRadius={5}
          />
          <Text text="DJ Booth" x={260 * scaleX} y={55 * scaleY} fill="white" fontSize={18 * Math.min(scaleX, scaleY)} />

          {/* Diamond shape in center of dance floor */}
          <Line
            points={[
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25), // top point (25% from top of dance floor)
              300 * scaleX + (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1), // right point (10% below center)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.95), // bottom point (5% from bottom of dance floor)
              300 * scaleX - (200 * scaleY * 0.585), 200 * scaleY + (200 * scaleY * 0.1), // left point (10% below center)
              300 * scaleX, 100 * scaleY + (200 * scaleY * 0.25)  // back to top to close the shape
            ]}
            closed={true}
            fill="#444466"
            stroke="#555577"
            strokeWidth={2}
          />

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
          />



        </Layer>
      </Stage>
    </div>
  );
}

// Simple score display
function TextScore({ score }) {
  return <div className="text-white text-xl mb-2">Score: {score}</div>;
}
