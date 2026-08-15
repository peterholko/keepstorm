"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDING_SPECS,
  BUILD_AREAS,
  CELL_SIZE,
  GRID_COLUMNS,
  GRID_ROWS,
  KEEP_MAX_HP,
  KEEP_POSITIONS,
  UNIT_SPECS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  validatePlacement,
  type Building,
  type BuildingKind,
  type GameState,
  type GridPoint,
  type Team,
  type Unit,
} from "@/lib/musterhold/engine";
import { drawAtlasCell, loadProcessedAtlas } from "./atlas-assets";

interface LoadedArt {
  player: HTMLCanvasElement;
  enemy: HTMLCanvasElement;
}

interface GameCanvasProps {
  state: GameState;
  selected: BuildingKind | null;
  onPlace: (kind: BuildingKind, gridX: number, gridY: number) => void;
  onCancelSelection: () => void;
  onHoverMessage: (message: string | null) => void;
}

interface HoverCell extends GridPoint {
  source: "pointer" | "keyboard";
}

const TEAM_COLORS: Record<Team, string> = {
  player: "#ffd45c",
  enemy: "#70f0c6",
};

function drawHealthBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  ratio: number,
  team: Team,
): void {
  context.fillStyle = "rgba(10, 13, 10, .82)";
  context.fillRect(x - width / 2 - 2, y - 2, width + 4, 8);
  context.fillStyle = ratio > 0.42 ? TEAM_COLORS[team] : "#f06b55";
  context.fillRect(x - width / 2, y, width * Math.max(0, ratio), 4);
}

function drawFootprint(
  context: CanvasRenderingContext2D,
  building: Building,
  color: string,
): void {
  const spec = BUILDING_SPECS[building.kind];
  const x = building.gridX * CELL_SIZE;
  const y = building.gridY * CELL_SIZE;
  context.fillStyle = `${color}1f`;
  context.strokeStyle = `${color}8a`;
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(x + 3, y + 3, spec.width * CELL_SIZE - 6, spec.height * CELL_SIZE - 6, 9);
  context.fill();
  context.stroke();
}

function drawBuilding(
  context: CanvasRenderingContext2D,
  building: Building,
  atlas: HTMLCanvasElement,
): void {
  const spec = BUILDING_SPECS[building.kind];
  const centerX = (building.gridX + spec.width / 2) * CELL_SIZE;
  const groundY = (building.gridY + spec.height) * CELL_SIZE + 8;
  const width = building.kind === "tallyhouse" ? 94 : 126;
  const height = building.kind === "tallyhouse" ? 118 : 154;
  drawFootprint(context, building, TEAM_COLORS[building.team]);
  context.save();
  context.shadowColor = "rgba(8, 10, 8, .55)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 7;
  drawAtlasCell(context, atlas, spec.atlasIndex, centerX, groundY - height / 2, width, height);
  context.restore();
  if (building.hp < building.maxHp) {
    drawHealthBar(context, centerX, groundY - height - 3, 70, building.hp / building.maxHp, building.team);
  }
}

function unitDimensions(unit: Unit): { width: number; height: number } {
  if (unit.kind === "ramguard") return { width: 68, height: 88 };
  if (unit.kind === "quillrunner") return { width: 64, height: 78 };
  return { width: 58, height: 72 };
}

function drawUnit(
  context: CanvasRenderingContext2D,
  unit: Unit,
  atlas: HTMLCanvasElement,
  elapsed: number,
): void {
  const spec = UNIT_SPECS[unit.kind];
  const { width, height } = unitDimensions(unit);
  const float = unit.kind === "wispwright" ? Math.sin(elapsed * 5 + unit.id) * 4 - 7 : 0;

  context.save();
  context.fillStyle = "rgba(5, 9, 7, .34)";
  context.beginPath();
  context.ellipse(unit.x, unit.y + 3, width * 0.29, 8, 0, 0, Math.PI * 2);
  context.fill();
  if (unit.attackFlash > 0) {
    context.shadowColor = TEAM_COLORS[unit.team];
    context.shadowBlur = 24;
  }
  drawAtlasCell(context, atlas, spec.atlasIndex, unit.x, unit.y - height / 2 + float, width, height);
  context.restore();
  drawHealthBar(context, unit.x, unit.y - height + float - 3, 34, unit.hp / unit.maxHp, unit.team);
}

function drawKeep(
  context: CanvasRenderingContext2D,
  state: GameState,
  team: Team,
  atlas: HTMLCanvasElement,
): void {
  const base = KEEP_POSITIONS[team];
  const x = base.x;
  const width = 220;
  const height = 270;
  context.save();
  context.shadowColor = "rgba(6, 9, 7, .62)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 10;
  drawAtlasCell(context, atlas, 0, x, base.y - 28, width, height);
  context.restore();
  drawHealthBar(context, x, base.y - 180, 122, state.keeps[team] / KEEP_MAX_HP, team);

  context.textAlign = "center";
  context.fillStyle = "rgba(12, 16, 12, .8)";
  context.fillRect(x - 62, base.y + 112, 124, 31);
  context.fillStyle = TEAM_COLORS[team];
  context.font = "800 13px Trebuchet MS, sans-serif";
  context.fillText(team === "player" ? "DAYBREAK" : "NIGHTVEIL", x, base.y + 126);
  context.fillStyle = "#fff3d5";
  context.font = "700 12px Trebuchet MS, sans-serif";
  context.fillText(`${Math.ceil(state.keeps[team])} HP`, x, base.y + 140);
}

function drawEffects(context: CanvasRenderingContext2D, state: GameState): void {
  for (const effect of state.effects) {
    const color = effect.team ? TEAM_COLORS[effect.team] : "#fff3d5";
    context.save();
    context.globalAlpha = Math.min(1, Math.max(0, effect.life * 1.8));
    if (effect.type === "hit" && effect.x2 !== undefined && effect.y2 !== undefined) {
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.beginPath();
      context.moveTo(effect.x, effect.y - 28);
      context.lineTo(effect.x2, effect.y2 - 24);
      context.stroke();
    } else if (effect.type === "spawn") {
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(effect.x, effect.y, 18 + (0.75 - effect.life) * 55, 0, Math.PI * 2);
      context.stroke();
    } else if (effect.type === "destroy") {
      context.fillStyle = "#33291f";
      for (let mote = 0; mote < 7; mote += 1) {
        const angle = mote * 0.9 + effect.id;
        const radius = (1.2 - effect.life) * 42;
        context.beginPath();
        context.arc(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius, 10 + mote % 3, 0, Math.PI * 2);
        context.fill();
      }
    } else if (effect.type === "reprieve") {
      context.strokeStyle = color;
      context.lineWidth = 9;
      context.shadowColor = color;
      context.shadowBlur = 26;
      context.beginPath();
      context.arc(effect.x, effect.y, 120 + (1.5 - effect.life) * 360, 0, Math.PI * 2);
      context.stroke();
    } else if (effect.type === "yield") {
      context.fillStyle = color;
      context.textAlign = "center";
      context.font = "900 22px Trebuchet MS, sans-serif";
      context.fillText("+ YIELD", effect.x, effect.y - 155 - (0.8 - effect.life) * 35);
    }
    context.restore();
  }
}

function drawGrid(context: CanvasRenderingContext2D, team: Team, bright: boolean): void {
  const color = TEAM_COLORS[team];
  context.save();
  for (const zone of BUILD_AREAS[team]) {
    const x = zone.minX * CELL_SIZE;
    const y = zone.minY * CELL_SIZE;
    const width = (zone.maxX - zone.minX + 1) * CELL_SIZE;
    const height = (zone.maxY - zone.minY + 1) * CELL_SIZE;
    context.fillStyle = bright ? `${color}18` : `${color}0b`;
    context.fillRect(x, y, width, height);
    context.strokeStyle = bright ? `${color}70` : `${color}30`;
    context.lineWidth = bright ? 2 : 1;
    for (let column = zone.minX; column <= zone.maxX + 1; column += 1) {
      context.beginPath();
      context.moveTo(column * CELL_SIZE, y);
      context.lineTo(column * CELL_SIZE, y + height);
      context.stroke();
    }
    for (let row = zone.minY; row <= zone.maxY + 1; row += 1) {
      context.beginPath();
      context.moveTo(x, row * CELL_SIZE);
      context.lineTo(x + width, row * CELL_SIZE);
      context.stroke();
    }
    context.strokeStyle = bright ? color : `${color}80`;
    context.lineWidth = bright ? 4 : 2;
    context.strokeRect(x, y, width, height);
  }
  context.restore();
}

function drawRoute(context: CanvasRenderingContext2D, path: GridPoint[] | undefined): void {
  if (!path || path.length < 2) return;
  context.save();
  context.strokeStyle = "rgba(255, 243, 213, .88)";
  context.lineWidth = 4;
  context.setLineDash([8, 7]);
  context.beginPath();
  path.forEach((point, index) => {
    const x = point.x * CELL_SIZE + CELL_SIZE / 2;
    const y = point.y * CELL_SIZE + CELL_SIZE / 2;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();
}

export default function GameCanvas({ state, selected, onPlace, onCancelSelection, onHoverMessage }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<LoadedArt | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hover, setHover] = useState<HoverCell | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [renderScale, setRenderScale] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadProcessedAtlas("/game/daybreak-atlas.png"),
      loadProcessedAtlas("/game/nightveil-atlas.png"),
    ]).then(([player, enemy]) => {
      if (active) setArt({ player, enemy });
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateRenderScale = () => {
      const bounds = canvas.getBoundingClientRect();
      const cssScale = Math.max(bounds.width / WORLD_WIDTH, bounds.height / WORLD_HEIGHT);
      const next = Math.max(1, Math.min(2, cssScale * Math.min(window.devicePixelRatio || 1, 2)));
      setRenderScale((current) => Math.abs(current - next) > 0.05 ? next : current);
    };
    updateRenderScale();
    const observer = new ResizeObserver(updateRenderScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selected) scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [selected]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  const hoverValidation = useMemo(() => {
    if (!selected || !hover) return null;
    return validatePlacement(state, "player", selected, hover.x, hover.y);
  }, [hover, selected, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !art) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "rgba(10, 16, 9, .055)";
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawGrid(context, "player", Boolean(selected));
    drawGrid(context, "enemy", false);

    if (selected && hover && hoverValidation) {
      const spec = BUILDING_SPECS[selected];
      const color = hoverValidation.valid ? "#ffe078" : "#f06b55";
      const x = hover.x * CELL_SIZE;
      const y = hover.y * CELL_SIZE;
      context.fillStyle = `${color}45`;
      context.strokeStyle = color;
      context.lineWidth = 4;
      context.fillRect(x + 2, y + 2, spec.width * CELL_SIZE - 4, spec.height * CELL_SIZE - 4);
      context.strokeRect(x + 2, y + 2, spec.width * CELL_SIZE - 4, spec.height * CELL_SIZE - 4);
      if (hoverValidation.valid) {
        drawRoute(context, hoverValidation.path);
        context.save();
        context.globalAlpha = 0.72;
        const width = selected === "tallyhouse" ? 94 : 126;
        const height = selected === "tallyhouse" ? 118 : 154;
        const centerX = (hover.x + spec.width / 2) * CELL_SIZE;
        const groundY = (hover.y + spec.height) * CELL_SIZE + 8;
        drawAtlasCell(context, art.player, spec.atlasIndex, centerX, groundY - height / 2, width, height);
        context.restore();
      }
    }

    drawKeep(context, state, "player", art.player);
    drawKeep(context, state, "enemy", art.enemy);

    const fieldObjects: Array<{ y: number; draw: () => void }> = [];
    for (const building of state.buildings) {
      const spec = BUILDING_SPECS[building.kind];
      fieldObjects.push({
        y: (building.gridY + spec.height) * CELL_SIZE,
        draw: () => drawBuilding(context, building, building.team === "player" ? art.player : art.enemy),
      });
    }
    for (const unit of state.units) {
      fieldObjects.push({
        y: unit.y,
        draw: () => drawUnit(context, unit, unit.team === "player" ? art.player : art.enemy, state.elapsed),
      });
    }
    fieldObjects.sort((left, right) => left.y - right.y).forEach((object) => object.draw());
    drawEffects(context, state);
  }, [art, hover, hoverValidation, renderScale, selected, state]);

  const cellFromPointer = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): HoverCell => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor((event.clientX - bounds.left) / bounds.width * WORLD_WIDTH / CELL_SIZE))),
      y: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor((event.clientY - bounds.top) / bounds.height * WORLD_HEIGHT / CELL_SIZE))),
      source: "pointer",
    };
  };

  const updateHover = (cell: HoverCell | null) => {
    setHover(cell);
    if (!cell || !selected) onHoverMessage(null);
    else onHoverMessage(validatePlacement(state, "player", selected, cell.x, cell.y).reason);
  };

  const commitPlacement = () => {
    if (!selected || !hover) return;
    const validation = validatePlacement(state, "player", selected, hover.x, hover.y);
    onHoverMessage(validation.reason);
    if (validation.valid) onPlace(selected, hover.x, hover.y);
  };

  const updateScrollRatio = () => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const maximum = viewport.scrollWidth - viewport.clientWidth;
    setScrollRatio(maximum > 0 ? viewport.scrollLeft / maximum : 0);
  };

  const panCamera = (direction: -1 | 1) => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.scrollBy({ left: viewport.clientWidth * 0.72 * direction, behavior: "smooth" });
  };

  const moveCameraTo = (ratio: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.scrollTo({ left: (viewport.scrollWidth - viewport.clientWidth) * ratio, behavior });
  };

  const cameraLabel = scrollRatio < 0.18 ? "DAYBREAK YARD" : scrollRatio > 0.82 ? "NIGHTVEIL YARD" : "CONTESTED ROAD";

  return (
    <div className="battlefield-frame">
      {(!art || !mapReady) && <div className="battlefield-loading"><span />Preparing the Twin Yards…</div>}
      <div
        ref={scrollRef}
        className="battlefield-scroll"
        onScroll={updateScrollRatio}
      >
        <div className="battlefield-world">
          {/* A direct image preserves the lossless board at its authored resolution. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="battlefield-map"
            src="/game/battlefield-panorama.png"
            alt=""
            draggable={false}
            onLoad={() => setMapReady(true)}
          />
          <canvas
            ref={canvasRef}
            width={Math.round(WORLD_WIDTH * renderScale)}
            height={Math.round(WORLD_HEIGHT * renderScale)}
            className={selected ? "battlefield-canvas is-building" : "battlefield-canvas"}
            aria-label="The double-width Twin Yards battlefield. Scroll horizontally with the camera controls, mouse wheel, trackpad, touch, or A and D keys. Choose a Foundry below, then place it in either illuminated Daybreak construction field at the far left."
            tabIndex={0}
            onPointerMove={(event) => updateHover(cellFromPointer(event))}
            onPointerLeave={() => updateHover(null)}
            onPointerDown={(event) => {
              if (event.button === 2) onCancelSelection();
            }}
            onClick={(event) => {
              const cell = cellFromPointer(event);
              updateHover(cell);
              if (!selected) return;
              const validation = validatePlacement(state, "player", selected, cell.x, cell.y);
              onHoverMessage(validation.reason);
              if (validation.valid) onPlace(selected, cell.x, cell.y);
            }}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              const key = event.key.toLowerCase();
              if (key === "a") { event.preventDefault(); panCamera(-1); return; }
              if (key === "d") { event.preventDefault(); panCamera(1); return; }
              if (event.key === "Home") { event.preventDefault(); moveCameraTo(0); return; }
              if (event.key === "End") { event.preventDefault(); moveCameraTo(1); return; }
              if (event.key === "Escape") { onCancelSelection(); return; }
              if (event.key === "Enter") { commitPlacement(); return; }
              if (!selected && event.key === "ArrowLeft") { event.preventDefault(); panCamera(-1); return; }
              if (!selected && event.key === "ArrowRight") { event.preventDefault(); panCamera(1); return; }
              const movement: Record<string, GridPoint> = {
                ArrowLeft: { x: -1, y: 0 },
                ArrowRight: { x: 1, y: 0 },
                ArrowUp: { x: 0, y: -1 },
                ArrowDown: { x: 0, y: 1 },
              };
              const delta = movement[event.key];
              if (!delta) return;
              event.preventDefault();
              const origin = hover ?? { x: 9, y: 4, source: "keyboard" as const };
              updateHover({
                x: Math.max(0, Math.min(GRID_COLUMNS - 1, origin.x + delta.x)),
                y: Math.max(0, Math.min(GRID_ROWS - 1, origin.y + delta.y)),
                source: "keyboard",
              });
            }}
          />
        </div>
      </div>
      <div className="camera-controls" aria-label="Battlefield camera controls">
        <button onClick={() => panCamera(-1)} aria-label="Scroll battlefield left">‹</button>
        <label>
          <span>{cameraLabel}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(scrollRatio * 100)}
            onChange={(event) => moveCameraTo(Number(event.target.value) / 100, "auto")}
            aria-label="Battlefield horizontal position"
          />
          <small>A / D · WHEEL · SWIPE</small>
        </label>
        <button onClick={() => panCamera(1)} aria-label="Scroll battlefield right">›</button>
      </div>
    </div>
  );
}
