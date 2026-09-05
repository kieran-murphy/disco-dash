"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/spotifyAuth";

// Landing spot for Spotify's OAuth redirect (registered as the app's redirect URI in the
// Spotify dashboard). Trades the ?code= for tokens, then bounces straight back to the game.
export default function SpotifyCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const authError = params.get("error");

    if (authError) {
      setError(authError);
      return;
    }
    if (!code) {
      setError("Missing authorization code");
      return;
    }

    exchangeCodeForTokens(code)
      .then(() => router.replace("/"))
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a18] text-sm text-[#aab0ff]">
      {error ? `Spotify login failed: ${error}` : "Connecting to Spotify…"}
    </div>
  );
}
