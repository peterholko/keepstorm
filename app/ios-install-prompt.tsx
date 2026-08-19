"use client";

import { useEffect, useId, useState } from "react";
import { shouldShowIOSInstallPrompt } from "@/lib/keepstorm/install-prompt";

const DISMISSAL_STORAGE_KEY = "keepstorm:ios-install-prompt-dismissed-at";
const APPEAR_DELAY_MS = 700;

interface IOSNavigator extends Navigator {
  standalone?: boolean;
}

function readDismissedAt(): number | null {
  try {
    const value = Number(window.localStorage.getItem(DISMISSAL_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export default function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const iosNavigator = window.navigator as IOSNavigator;
    const eligible = shouldShowIOSInstallPrompt({
      userAgent: iosNavigator.userAgent,
      platform: iosNavigator.platform,
      maxTouchPoints: iosNavigator.maxTouchPoints,
      displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
      navigatorStandalone: iosNavigator.standalone === true,
      dismissedAt: readDismissedAt(),
    });
    if (!eligible) return;
    const timeout = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSAL_STORAGE_KEY, String(Date.now()));
    } catch {
      // Storage can be unavailable in private browsing; the current dismissal still works.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="ios-install-prompt" role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button type="button" className="ios-install-prompt-close" onClick={dismiss} aria-label="Dismiss Home Screen suggestion">×</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ios-install-prompt-icon" src="/brand/keepstorm-crest-v1.png" alt="" aria-hidden="true" width="512" height="512" />
      <div className="ios-install-prompt-copy">
        <span>FULLSCREEN APP</span>
        <h2 id={titleId}>Open Keepstorm from your Home Screen</h2>
        <p id={descriptionId}>Tap Safari’s <b>Share</b> button, choose <b>Add to Home Screen</b>, keep <b>Open as Web App</b> on if shown, then launch the new Keepstorm icon.</p>
      </div>
      <button type="button" className="ios-install-prompt-continue" onClick={dismiss}>Continue in Safari</button>
    </aside>
  );
}
