export interface RenderPoint {
  x: number;
  y: number;
}

export interface UnitMotion {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  duration: number;
}

const MIN_MOTION_DURATION_MS = 32;
const MAX_MOTION_DURATION_MS = 220;
const FALLBACK_MOTION_DURATION_MS = 50;

export function motionDurationForSnapshots(previousElapsed: number | null, nextElapsed: number): number {
  if (previousElapsed === null) return FALLBACK_MOTION_DURATION_MS;
  const elapsed = (nextElapsed - previousElapsed) * 1000;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return FALLBACK_MOTION_DURATION_MS;
  return Math.max(MIN_MOTION_DURATION_MS, Math.min(MAX_MOTION_DURATION_MS, elapsed));
}

export function stationaryUnitMotion(point: RenderPoint, now: number): UnitMotion {
  return {
    fromX: point.x,
    fromY: point.y,
    toX: point.x,
    toY: point.y,
    startedAt: now,
    duration: 0,
  };
}

export function sampleUnitMotion(motion: UnitMotion, now: number): RenderPoint {
  if (motion.duration <= 0) return { x: motion.toX, y: motion.toY };
  const progress = Math.max(0, Math.min(1, (now - motion.startedAt) / motion.duration));
  return {
    x: motion.fromX + (motion.toX - motion.fromX) * progress,
    y: motion.fromY + (motion.toY - motion.fromY) * progress,
  };
}

export function retargetUnitMotion(previous: UnitMotion, target: RenderPoint, now: number, duration: number): UnitMotion {
  const current = sampleUnitMotion(previous, now);
  return {
    fromX: current.x,
    fromY: current.y,
    toX: target.x,
    toY: target.y,
    startedAt: now,
    duration,
  };
}
