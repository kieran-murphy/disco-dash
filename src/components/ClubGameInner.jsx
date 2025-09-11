"use client";
import { Stage, Layer, Rect, Circle, Text } from "react-konva";
import { useEffect, useState } from "react";

export default function ClubGameInner() {
  const [dancers, setDancers] = useState([
    { x: 150, y: 200, color: "#ffcc00" },
    { x: 230, y: 200, color: "#ffcc00" },
    { x: 310, y: 200, color: "#ffcc00" },
    { x: 390, y: 200, color: "#ffcc00" },
    { x: 470, y: 200, color: "#ffcc00" },
  ]);
  const [lights, setLights] = useState([]);
  const [score, setScore] = useState(0);

  // Animate lights
  useEffect(() => {
    const interval = setInterval(() => {
      const newLights = [];
      for (let i = 0; i < 5; i++) {
        newLights.push({
          x: 120 + Math.random() * 360,
          y: 110 + Math.random() * 180,
          color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        });
      }
      setLights(newLights);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animate dancers up/down
  useEffect(() => {
    const ticker = setInterval(() => {
      setDancers((prev) =>
        prev.map((d, i) => ({
          ...d,
          y: 200 + Math.sin(Date.now() / 200 + i) * 10,
        }))
      );
    }, 50);
    return () => clearInterval(ticker);
  }, []);

  // Add dancer on floor click
  const addDancer = (e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Only add if clicked inside dance floor
    if (
      pointer.x > 100 &&
      pointer.x < 500 &&
      pointer.y > 100 &&
      pointer.y < 300
    ) {
      setDancers((prev) => [
        ...prev,
        { x: pointer.x, y: pointer.y, color: "#ffcc00" },
      ]);
    }
  };

  // Click a dancer to score points
  const handleDancerClick = (index) => {
    setScore((prev) => prev + 10);
    setDancers((prev) =>
      prev.map((d, i) =>
        i === index
          ? { ...d, color: `hsl(${Math.random() * 360}, 100%, 50%)` } // flash color
          : d
      )
    );
  };

  return (
    <div className="flex flex-col items-center">
      <TextScore score={score} />
      <Stage width={600} height={400} onClick={addDancer}>
        <Layer>
          {/* Dance floor */}
          <Rect
            x={100}
            y={100}
            width={400}
            height={200}
            fill="#222244"
            cornerRadius={10}
          />

          {/* DJ booth */}
          <Rect
            x={250}
            y={50}
            width={100}
            height={40}
            fill="#aa4444"
            cornerRadius={5}
          />
          <Text text="DJ Booth" x={260} y={55} fill="white" fontSize={18} />

          {/* Dancers */}
          {dancers.map((d, i) => (
            <Circle
              key={i}
              x={d.x}
              y={d.y}
              radius={10}
              fill={d.color}
              onClick={(e) => {
                e.cancelBubble = true; // prevent stage click
                handleDancerClick(i);
              }}
            />
          ))}

          {/* Lights */}
          {lights.map((l, i) => (
            <Circle
              key={i}
              x={l.x}
              y={l.y}
              radius={15}
              fill={l.color}
              opacity={0.6}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

// Simple score display
function TextScore({ score }) {
  return <div className="text-white text-xl mb-2">Score: {score}</div>;
}
