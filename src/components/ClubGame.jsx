"use client";
import dynamic from "next/dynamic";

const ClubGameInner = dynamic(() => import("./ClubGameInner"), { ssr: false });

export default function ClubGame() {
  return (
    <div className="flex justify-center items-center w-screen h-screen bg-gray-900">
      <ClubGameInner />
    </div>
  );
}
