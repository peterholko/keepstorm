"use client";

import { useEffect, useState } from "react";

export const COARSE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";
export const PHONE_LANDSCAPE_QUERY = `${COARSE_POINTER_QUERY} and (max-height: 520px)`;
export const PHONE_PORTRAIT_QUERY = `${COARSE_POINTER_QUERY} and (orientation: portrait) and (max-width: 760px)`;
export const TOUCH_TABLET_QUERY = `${COARSE_POINTER_QUERY} and (min-width: 761px) and (min-height: 521px) and (max-width: 800px)`;

export interface DeviceProfile {
  coarsePointer: boolean;
  phoneLandscape: boolean;
  phonePortrait: boolean;
  touchTablet: boolean;
}

const DESKTOP_PROFILE: DeviceProfile = {
  coarsePointer: false,
  phoneLandscape: false,
  phonePortrait: false,
  touchTablet: false,
};

function readDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") return DESKTOP_PROFILE;
  return {
    coarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
    phoneLandscape: window.matchMedia(PHONE_LANDSCAPE_QUERY).matches,
    phonePortrait: window.matchMedia(PHONE_PORTRAIT_QUERY).matches,
    touchTablet: window.matchMedia(TOUCH_TABLET_QUERY).matches,
  };
}

export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(DESKTOP_PROFILE);

  useEffect(() => {
    const queries = [COARSE_POINTER_QUERY, PHONE_LANDSCAPE_QUERY, PHONE_PORTRAIT_QUERY, TOUCH_TABLET_QUERY]
      .map((query) => window.matchMedia(query));
    const update = () => setProfile(readDeviceProfile());
    update();
    queries.forEach((query) => query.addEventListener("change", update));
    return () => queries.forEach((query) => query.removeEventListener("change", update));
  }, []);

  return profile;
}
