"use client";
import { Music2, LogOut } from "lucide-react";

// Small HUD panel for the Spotify connection, mirroring StatsHud's props-in style (all
// state/polling lives in useSpotifyNowPlaying, called by ClubGameInner) — a "Connect Spotify"
// button when logged out, a compact now-playing card when logged in. Mirrors StatsHud's
// top-right inset but on the opposite corner so the two HUDs never collide.
export default function SpotifyPanel({ isLoggedIn, track, onLogin, onLogout }) {
  if (!isLoggedIn) {
    return (
      <div className="pointer-events-none fixed top-[calc(5%+1rem)] left-[calc(5%+1rem)] z-10">
        <button
          type="button"
          onClick={onLogin}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#1DB954] bg-[#15152b]/90 px-4 py-2 text-sm font-semibold text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.35)] backdrop-blur-sm transition hover:bg-[#1c1c38]"
        >
          <Music2 className="h-4 w-4" strokeWidth={2} />
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed top-[calc(5%+1rem)] left-[calc(5%+1rem)] z-10">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#3f3f6b] bg-[#15152b]/90 px-3 py-2 shadow-[0_0_12px_rgba(95,227,255,0.25)] backdrop-blur-sm">
        {track?.albumArt ? (
          <img src={track.albumArt} alt="" className="h-8 w-8 rounded" />
        ) : (
          <Music2 className="h-8 w-8 text-[#aab0ff]" strokeWidth={1.5} />
        )}
        <div className="flex flex-col leading-tight">
          <span className="max-w-[140px] truncate text-xs font-semibold text-white">
            {track?.name || "Nothing playing"}
          </span>
          <span className="max-w-[140px] truncate text-[10px] text-[#aab0ff]">
            {track?.artist || "Play something on Spotify"}
          </span>
        </div>
        <button type="button" onClick={onLogout} className="ml-1 text-[#aab0ff] transition hover:text-white">
          <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
