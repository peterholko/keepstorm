import {
  CELL_SIZE,
  GRID_COLUMNS,
  GRID_ROWS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GridPoint,
} from "./engine.ts";

export const TOUCH_PLACEMENT_LIFT_PX = 56;

interface BattlefieldBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function placementCellFromClientPoint(
  clientX: number,
  clientY: number,
  bounds: BattlefieldBounds,
  liftY = 0,
): GridPoint {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const worldX = (clientX - bounds.left) / width * WORLD_WIDTH;
  const worldY = (clientY - bounds.top - liftY) / height * WORLD_HEIGHT;

  return {
    x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor(worldX / CELL_SIZE))),
    y: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(worldY / CELL_SIZE))),
  };
}
