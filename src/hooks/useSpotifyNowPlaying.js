"use client";
import { useCallback, useEffect, useState } from "react";
import { clearTokens, getStoredTokens, getValidAccessToken, redirectToSpotifyLogin } from "@/lib/spotifyAuth";

const POLL_INTERVAL_MS = 5000;

// Polls Spotify's "currently playing" endpoint for whatever's playing on the user's own
// account — on their phone, desktop app, or anywhere else, not something streamed into this
// page. Read-only, so it works on Free or Premium and doesn't need the Premium-only in-browser
// Web Playback SDK (which this game doesn't use).
export default function useSpotifyNowPlaying() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [track, setTrack] = useState(null); // { name, artist, albumArt, isPlaying }

  useEffect(() => {
    setIsLoggedIn(!!getStoredTokens());
  }, []);

  const poll = useCallback(async () => {
    const accessToken = await getValidAccessToken().catch(() => null);
    if (!accessToken) {
      setIsLoggedIn(false);
      return;
    }
    setIsLoggedIn(true);

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 204) {
      setTrack(null); // nothing playing right now
      return;
    }
    if (!res.ok) return;

    const data = await res.json();
    setTrack(
      data?.item
        ? {
            name: data.item.name,
            artist: data.item.artists?.map((a) => a.name).join(", "),
            albumArt: data.item.album?.images?.[2]?.url || data.item.album?.images?.[0]?.url,
            isPlaying: data.is_playing,
          }
        : null
    );
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLoggedIn, poll]);

  const login = useCallback(() => redirectToSpotifyLogin(), []);
  const logout = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    setTrack(null);
  }, []);

  return { isLoggedIn, track, login, logout };
}
