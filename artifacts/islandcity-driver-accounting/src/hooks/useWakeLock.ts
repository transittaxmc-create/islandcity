// ── Screen Wake Lock with iOS video fallback ────────────────────────
// Ported from EI Program v2.0. Keeps the screen on during a shift:
// Method 1: native Screen Wake Lock API (iOS 16.4+ / Android)
// Method 2: muted looping 1px video (works on all iOS incl. PWA)
import { useCallback, useEffect, useRef, useState } from "react";

// Tiny valid mp4 used purely to keep the media session alive.
const WAKE_VIDEO_SRC =
  "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0bG1wNjQ0AAACam1kYXQ=";

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [held, setHeld] = useState(false);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // already released
      }
      wakeLockRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
    setHeld(false);
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    // Method 1: native Wake Lock API
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setHeld(true);
        wakeLockRef.current.addEventListener("release", () => setHeld(false));
        return true;
      } catch (e) {
        console.warn("WakeLock API failed, trying video fallback:", e);
      }
    }
    // Method 2: video fallback
    try {
      if (!videoRef.current) {
        const v = document.createElement("video");
        v.setAttribute("playsinline", "");
        v.setAttribute("loop", "");
        v.muted = true;
        v.style.position = "fixed";
        v.style.width = "1px";
        v.style.height = "1px";
        v.style.top = "-10px";
        v.style.left = "-10px";
        v.style.opacity = "0";
        v.style.pointerEvents = "none";
        v.src = WAKE_VIDEO_SRC;
        document.body.appendChild(v);
        videoRef.current = v;
      }
      await videoRef.current.play();
      setHeld(true);
      return true;
    } catch (e) {
      console.warn("WakeLock all methods failed:", e);
      setHeld(false);
      return false;
    }
  }, []);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (wakeLockRef.current || videoRef.current) {
      await release();
      return false;
    }
    return request();
  }, [release, request]);

  // Re-acquire when the page becomes visible again (screen lock / background)
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === "visible" && held) {
        if ("wakeLock" in navigator) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            setHeld(true);
          } catch {
            console.warn("WakeLock re-acquire failed");
          }
        }
        if (videoRef.current && videoRef.current.paused) {
          try {
            await videoRef.current.play();
          } catch {
            console.warn("Video wake re-acquire failed");
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [held]);

  // Release on unmount
  useEffect(() => {
    return () => {
      void release();
    };
  }, [release]);

  return { held, toggle, request, release };
}
