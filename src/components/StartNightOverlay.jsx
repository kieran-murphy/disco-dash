"use client";
import { Disc3 } from "lucide-react";

// Full-screen gate shown before the club opens for the night — nothing (customer arrivals,
// money, VIP points) ticks until the player clicks through. Not persisted, so it reappears
// on every load/refresh, same as the rest of the game state.
export default function StartNightOverlay({ onOpen }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#0a0a18]/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-[#3f3f6b] bg-[#15152b]/95 px-10 py-8 shadow-[0_0_30px_rgba(95,227,255,0.25)]">
        <Disc3 className="h-10 w-10 animate-spin text-[#5fe3ff]" strokeWidth={1.5} style={{ animationDuration: "3s" }} />
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-lg font-bold tracking-wide text-white">Disco Dash</span>
          <span className="text-xs text-[#aab0ff]">The club is closed. Open the doors to start the night.</span>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-2 rounded-xl border border-[#ff5fd1] bg-[#2b1530]/90 px-6 py-2.5 text-sm font-semibold text-[#ff5fd1] shadow-[0_0_12px_rgba(255,95,209,0.35)] transition hover:bg-[#3a1c40]"
        >
          Open the Doors
        </button>
      </div>
    </div>
  );
}
