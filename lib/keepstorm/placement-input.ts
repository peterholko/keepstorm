import {
  CELL_SIZE,
  GRID_COLUMNS,
  GRID_ROWS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GridPoint,
  type GridRect,
} from "./engine.ts";

export const TOUCH_PLACEMENT_LIFT_PX = 56;

interface BattlefieldBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PercentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlacementFootprint {
  width: number;
  height: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface SelectableWorldPoint extends WorldPoint {
  id: number;
}

const YARD_TARGET_CELL_PX = 24;
const YARD_MIN_CELL_PX = 20;
const YARD_MAX_CELL_PX = 28;
const YARD_MARGIN_CELLS = 1;

export function placementCellFromClientPoint(
  clientX: number,
  clientY: number,
  bounds: BattlefieldBounds,
  liftY = 0,
): GridPoint {
  const world = worldPointFromClientPoint(clientX, clientY, bounds, liftY);

  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(world.x / CELL_SIZE))),
    y: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(world.y / CELL_SIZE))),
  };
}

export function worldPointFromClientPoint(
  clientX: number,
  clientY: number,
  bounds: BattlefieldBounds,
  liftY = 0,
): WorldPoint {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const worldX = (clientX - bounds.left) / width * WORLD_WIDTH;
  const worldY = (clientY - bounds.top - liftY) / height * WORLD_HEIGHT;

  return {
    x: Math.max(0, Math.min(WORLD_WIDTH, worldX)),
    y: Math.max(0, Math.min(WORLD_HEIGHT, worldY)),
  };
}

export function unitIdAtWorldPoint(units: SelectableWorldPoint[], point: WorldPoint, radius: number): number | null {
  let nearestId: number | null = null;
  let nearestDistance = Math.max(0, radius) ** 2;
  for (const unit of units) {
    const distance = (unit.x - point.x) ** 2 + (unit.y - point.y) ** 2;
    if (distance > nearestDistance) continue;
    nearestId = unit.id;
    nearestDistance = distance;
  }
  return nearestId;
}

export function cellRectPercent(cell: GridPoint, footprint: PlacementFootprint): PercentRect {
  return {
    left: cell.x / GRID_COLUMNS * 100,
    top: cell.y / GRID_ROWS * 100,
    width: footprint.width / GRID_COLUMNS * 100,
    height: footprint.height / GRID_ROWS * 100,
  };
}

export function gridRectPercent(rect: GridRect): PercentRect {
  return cellRectPercent(
    { x: rect.minX, y: rect.minY },
    { width: rect.maxX - rect.minX + 1, height: rect.maxY - rect.minY + 1 },
  );
}

export function shouldCancelPlacementFromContextMenu(pointerType: string | undefined, touchActive = false): boolean {
  return !touchActive && pointerType === "mouse";
}

export function yardZoomFactor(stageWidth: number, stageHeight: number, railWidth = 0, yardWidthCells = 11): number {
  const viewportWidth = Math.max(1, stageWidth - railWidth);
  const fieldCellSize = Math.max(1, stageHeight) / GRID_ROWS;
  const widthLimitedCellSize = viewportWidth / (yardWidthCells + YARD_MARGIN_CELLS * 2);
  const yardCellSize = Math.min(
    YARD_MAX_CELL_PX,
    Math.max(YARD_MIN_CELL_PX, Math.min(YARD_TARGET_CELL_PX, widthLimitedCellSize)),
  );
  return Math.max(1, yardCellSize / fieldCellSize);
}

export function yardFrame(areas: GridRect[], currentCenter?: WorldPoint | null): WorldPoint | null {
  if (!areas.length) return null;
  const centers = areas.map((area) => ({
    x: (area.minX + area.maxX + 1) / 2 * CELL_SIZE,
    y: (area.minY + area.maxY + 1) / 2 * CELL_SIZE,
  }));
  if (!currentCenter) return centers.reduce((upper, center) => center.y < upper.y ? center : upper);
  return centers.reduce((nearest, center) => {
    const nearestDistance = (nearest.x - currentCenter.x) ** 2 + (nearest.y - currentCenter.y) ** 2;
    const centerDistance = (center.x - currentCenter.x) ** 2 + (center.y - currentCenter.y) ** 2;
    return centerDistance < nearestDistance ? center : nearest;
  });
}
