"use client";

import { useEffect, useState } from "react";
import { getReducedMotionPref } from "@/lib/session";

export function useReducedMotion(): boolean {
  const [systemPref, setSystemPref] = useState(false);
  const [userPref, setUserPref] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemPref(mq.matches);
    setUserPref(getReducedMotionPref());
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches);
    mq.addEventListener("change", handler);
    const onStorage = () => setUserPref(getReducedMotionPref());
    window.addEventListener("storage", onStorage);
    window.addEventListener("reduced-motion-change", onStorage);
    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("reduced-motion-change", onStorage);
    };
  }, []);

  return systemPref || userPref;
}
