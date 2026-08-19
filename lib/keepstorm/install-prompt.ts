export const IOS_INSTALL_PROMPT_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;

const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/i;
const OTHER_IOS_BROWSER_PATTERN = /CriOS|FxiOS|EdgiOS|OPiOS/i;

export interface IOSInstallPromptEnvironment {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  displayModeStandalone?: boolean;
  navigatorStandalone?: boolean;
  dismissedAt?: number | null;
  now?: number;
}

export function isIOSDevice(userAgent: string, platform = "", maxTouchPoints = 0): boolean {
  return IOS_DEVICE_PATTERN.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isSafariOnIOS(userAgent: string): boolean {
  return /AppleWebKit/i.test(userAgent) && /Safari/i.test(userAgent) && !OTHER_IOS_BROWSER_PATTERN.test(userAgent);
}

export function shouldShowIOSInstallPrompt(environment: IOSInstallPromptEnvironment): boolean {
  const {
    userAgent,
    platform = "",
    maxTouchPoints = 0,
    displayModeStandalone = false,
    navigatorStandalone = false,
    dismissedAt = null,
    now = Date.now(),
  } = environment;

  if (!isIOSDevice(userAgent, platform, maxTouchPoints) || !isSafariOnIOS(userAgent)) return false;
  if (displayModeStandalone || navigatorStandalone) return false;
  if (dismissedAt !== null && Number.isFinite(dismissedAt) && now - dismissedAt < IOS_INSTALL_PROMPT_DISMISSAL_MS) return false;
  return true;
}
