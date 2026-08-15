"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDING_SPECS,
  BUILD_AREAS,
  CELL_SIZE,
  FACTIONS,
  FACTION_IDS,
  GRID_COLUMNS,
  GRID_ROWS,
  KEEP_MAX_HP,
  KEEP_POSITIONS,
  UNIT_SPECS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  buildAreasForCommander,
  commanderForBuilding,
  commanderForUnit,
  commandersForTeam,
  teamDisplayName,
  teamForCommander,
  validatePlacement,
  type Building,
  type BuildingKind,
  type CommanderId,
  type FactionId,
  type GameState,
  type GridPoint,
  type Team,
  type Unit,
} from "@/lib/keepstorm/engine";
import {
  motionDurationForSnapshots,
  retargetUnitMotion,
  sampleUnitMotion,
  stationaryUnitMotion,
  type UnitMotion,
} from "@/lib/keepstorm/render-motion";
import { drawAtlasCell, loadProcessedAtlas } from "./atlas-assets";

interface LoadedArt {
  keeps: Record<Team, HTMLCanvasElement>;
  factions: Record<FactionId, HTMLCanvasElement>;
}

interface GameCanvasProps {
  state: GameState;
  localCommander: CommanderId;
  selected: BuildingKind | null;
  selectedBuildingId: number | null;
  onPlace: (kind: BuildingKind, gridX: number, gridY: number) => void;
  onSelectBuilding: (buildingId: number | null) => void;
  onCancelSelection: () => void;
  onHoverMessage: (message: string | null) => void;
}

interface HoverCell extends GridPoint {
  source: "pointer" | "keyboard";
}

function teamColor(state: GameState, team: Team): string {
  return FACTIONS[state.factions[team]].color;
}

function commanderColor(state: GameState, commander: CommanderId): string {
  return FACTIONS[state.factions[commander]].color;
}

function drawHealthBar(context: CanvasRenderingContext2D, x: number, y: number, width: number, ratio: number, color: string): void {
  context.fillStyle = "rgba(10, 13, 10, .82)";
  context.fillRect(x - width / 2 - 2, y - 2, width + 4, 8);
  context.fillStyle = ratio > 0.42 ? color : "#f06b55";
  context.fillRect(x - width / 2, y, width * Math.max(0, ratio), 4);
}

function drawFootprint(context: CanvasRenderingContext2D, building: Building, color: string, selected: boolean): void {
  const spec = BUILDING_SPECS[building.kind];
  const x = building.gridX * CELL_SIZE;
  const y = building.gridY * CELL_SIZE;
  context.fillStyle = `${color}${selected ? "38" : "1f"}`;
  context.strokeStyle = selected ? "#fff2c8" : `${color}8a`;
  context.lineWidth = selected ? 4 : 2;
  context.beginPath();
  context.roundRect(x + 3, y + 3, spec.width * CELL_SIZE - 6, spec.height * CELL_SIZE - 6, 9);
  context.fill();
  context.stroke();
}

function buildingDimensions(building: Building): { width: number; height: number } {
  const category = BUILDING_SPECS[building.kind].category;
  if (category === "economy") return { width: 86, height: 104 };
  if (category === "tower") return { width: 82, height: 132 };
  if (category === "special") return { width: 92, height: 120 };
  return { width: 118, height: 140 };
}

function drawBuilding(context: CanvasRenderingContext2D, state: GameState, building: Building, atlas: HTMLCanvasElement, selected: boolean): void {
  const spec = BUILDING_SPECS[building.kind];
  const centerX = (building.gridX + spec.width / 2) * CELL_SIZE;
  const groundY = (building.gridY + spec.height) * CELL_SIZE + 8;
  const { width, height } = buildingDimensions(building);
  const color = commanderColor(state, commanderForBuilding(building));
  drawFootprint(context, building, color, selected);
  context.save();
  context.shadowColor = selected ? color : "rgba(8, 10, 8, .55)";
  context.shadowBlur = selected ? 22 : 10;
  context.shadowOffsetY = 7;
  drawAtlasCell(context, atlas, spec.atlasIndex, centerX, groundY - height / 2, width, height, false, 4, 4);
  context.restore();

  if (building.hp < building.maxHp || selected) drawHealthBar(context, centerX, groundY - height - 3, 70, building.hp / building.maxHp, color);
  context.save();
  context.textAlign = "center";
  context.fillStyle = building.level === 3 ? "#ffe17b" : "rgba(12, 16, 12, .86)";
  context.strokeStyle = building.level === 3 ? "#9f7625" : color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centerX + width * .34, groundY - height + 8, 12, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = building.level === 3 ? "#29210f" : "#fff3d5";
  context.font = "900 10px Trebuchet MS, sans-serif";
  context.fillText(building.level === 3 ? "★" : `L${building.level}`, centerX + width * .34, groundY - height + 12);
  context.restore();

  if (spec.spawnEvery) {
    const ratio = building.productionPaused ? 0 : Math.max(0, Math.min(1, 1 - building.spawnClock / spec.spawnEvery));
    context.fillStyle = "rgba(8, 11, 8, .8)";
    context.fillRect(centerX - 31, groundY + 5, 62, 5);
    context.fillStyle = building.productionPaused ? "#74756b" : color;
    context.fillRect(centerX - 30, groundY + 6, 60 * ratio, 3);
  }
}

function unitDimensions(unit: Unit): { width: number; height: number } {
  const role = UNIT_SPECS[unit.kind].role;
  if (role === "vanguard") return { width: 62, height: 78 };
  if (role === "siege") return { width: 72, height: 78 };
  if (role === "air") return { width: 68, height: 70 };
  if (role === "support") return { width: 55, height: 68 };
  return { width: 57, height: 70 };
}

function drawUnit(context: CanvasRenderingContext2D, state: GameState, unit: Unit, atlas: HTMLCanvasElement): void {
  const spec = UNIT_SPECS[unit.kind];
  const { width, height } = unitDimensions(unit);
  const float = spec.flying ? Math.sin(state.elapsed * 5 + unit.id) * 4 - 15 : spec.role === "support" ? Math.sin(state.elapsed * 4 + unit.id) * 2 - 3 : 0;
  const color = commanderColor(state, commanderForUnit(unit));

  context.save();
  context.fillStyle = "rgba(5, 9, 7, .34)";
  context.beginPath();
  context.ellipse(unit.x, unit.y + 3, width * .28, spec.flying ? 6 : 8, 0, 0, Math.PI * 2);
  context.fill();
  if (unit.attackFlash > 0 || unit.level === 3) {
    context.shadowColor = unit.level === 3 ? "#ffe17b" : color;
    context.shadowBlur = unit.level === 3 ? 18 : 24;
  }
  drawAtlasCell(context, atlas, spec.atlasIndex, unit.x, unit.y - height / 2 + float, width, height, unit.team === "enemy", 4, 4);
  context.restore();

  if (unit.shield > 0) {
    context.strokeStyle = "rgba(145, 230, 255, .75)";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(unit.x, unit.y - height / 2 + float, width * .46, height * .52, 0, 0, Math.PI * 2);
    context.stroke();
  }
  if (unit.poisonTimer > 0 || unit.slowTimer > 0 || unit.stunTimer > 0) {
    context.fillStyle = unit.stunTimer > 0 ? "#ffe17b" : unit.poisonTimer > 0 ? "#9bc95a" : "#76cce5";
    context.beginPath();
    context.arc(unit.x, unit.y - height + float - 8, 4, 0, Math.PI * 2);
    context.fill();
  }
  drawHealthBar(context, unit.x, unit.y - height + float - 3, 36, unit.hp / unit.maxHp, color);
}

function drawKeep(context: CanvasRenderingContext2D, state: GameState, team: Team, atlas: HTMLCanvasElement): void {
  const base = KEEP_POSITIONS[team];
  const visualY = base.y - 16;
  const width = 220;
  const height = 270;
  const color = teamColor(state, team);
  context.save();
  context.shadowColor = "rgba(6, 9, 7, .62)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 10;
  drawAtlasCell(context, atlas, 0, base.x, visualY - 28, width, height, team === "enemy");
  context.restore();
  drawHealthBar(context, base.x, visualY - 180, 122, state.keeps[team] / KEEP_MAX_HP, color);

  const armored = commandersForTeam(state, team).some((commander) => state.keepArmorUntil[commander] > state.elapsed);
  context.textAlign = "center";
  context.fillStyle = "rgba(12, 16, 12, .84)";
  context.fillRect(base.x - 74, visualY + 112, 148, 34);
  context.fillStyle = color;
  context.font = "800 11px Trebuchet MS, sans-serif";
  context.fillText(teamDisplayName(state, team).toUpperCase(), base.x, visualY + 126);
  context.fillStyle = "#fff3d5";
  context.font = "700 11px Trebuchet MS, sans-serif";
  context.fillText(`${Math.ceil(state.keeps[team])} HP${armored ? " · ARMORED" : ""}`, base.x, visualY + 140);
}

function drawEffects(context: CanvasRenderingContext2D, state: GameState): void {
  for (const effect of state.effects) {
    const color = effect.team ? teamColor(state, effect.team) : "#fff3d5";
    context.save();
    context.globalAlpha = Math.min(1, Math.max(0, effect.life * 1.7));
    if (effect.type === "hit" && effect.x2 !== undefined && effect.y2 !== undefined) {
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.shadowColor = color;
      context.shadowBlur = 12;
      context.beginPath();
      context.moveTo(effect.x, effect.y - 28);
      context.lineTo(effect.x2, effect.y2 - 24);
      context.stroke();
    } else if (effect.type === "spawn" || effect.type === "shield" || effect.type === "heal" || effect.type === "pulse" || effect.type === "upgrade" || effect.type === "item") {
      context.strokeStyle = effect.type === "heal" ? "#a6eb8b" : effect.type === "shield" ? "#8fdfff" : color;
      context.lineWidth = effect.type === "item" ? 8 : 5;
      context.shadowColor = context.strokeStyle;
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(effect.x, effect.y, 18 + (1.2 - effect.life) * (effect.type === "pulse" ? 150 : 68), 0, Math.PI * 2);
      context.stroke();
    } else if (effect.type === "destroy") {
      context.fillStyle = "#33291f";
      for (let mote = 0; mote < 7; mote += 1) {
        const angle = mote * .9 + effect.id;
        const radius = (1.2 - effect.life) * 42;
        context.beginPath();
        context.arc(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius, 8 + mote % 3, 0, Math.PI * 2);
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
      context.fillText(`${effect.label ?? "+"} MARKS`, effect.x, effect.y - 155 - (.8 - effect.life) * 35);
    }
    if (effect.label && effect.type !== "yield") {
      context.fillStyle = "#fff3d5";
      context.textAlign = "center";
      context.font = "900 13px Trebuchet MS, sans-serif";
      context.fillText(effect.label, effect.x, effect.y - 72 - (1.2 - effect.life) * 25);
    }
    context.restore();
  }
}

function drawGrid(context: CanvasRenderingContext2D, state: GameState, team: Team, bright: boolean, zones = BUILD_AREAS[team]): void {
  const color = teamColor(state, team);
  context.save();
  for (const zone of zones) {
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

export default function GameCanvas({ state, localCommander, selected, selectedBuildingId, onPlace, onSelectBuilding, onCancelSelection, onHoverMessage }: GameCanvasProps) {
  const localTeam = teamForCommander(localCommander);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<LoadedArt | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hover, setHover] = useState<HoverCell | null>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [renderScale, setRenderScale] = useState(1);
  const unitMotionsRef = useRef<Map<number, UnitMotion>>(new Map());
  const previousElapsedRef = useRef<number | null>(null);
  const snapshotAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadProcessedAtlas("/game/daybreak-atlas.png"),
      loadProcessedAtlas("/game/nightveil-atlas.png"),
      ...FACTION_IDS.map((faction) => loadProcessedAtlas(FACTIONS[faction].atlas)),
    ]).then(([playerKeep, enemyKeep, ...factionArt]) => {
      if (!active) return;
      const factions = Object.fromEntries(FACTION_IDS.map((faction, index) => [faction, factionArt[index]])) as Record<FactionId, HTMLCanvasElement>;
      setArt({ keeps: { player: playerKeep, enemy: enemyKeep }, factions });
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
      setRenderScale((current) => Math.abs(current - next) > .05 ? next : current);
    };
    updateRenderScale();
    const observer = new ResizeObserver(updateRenderScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!selected || !viewport) return;
    viewport.scrollTo({ left: localTeam === "player" ? 0 : viewport.scrollWidth - viewport.clientWidth, behavior: "smooth" });
  }, [localTeam, selected]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!mapReady || !viewport) return;
    viewport.scrollTo({ left: localTeam === "player" ? 0 : viewport.scrollWidth - viewport.clientWidth, behavior: "auto" });
  }, [localTeam, mapReady]);

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
    return validatePlacement(state, localCommander, selected, hover.x, hover.y);
  }, [hover, localCommander, selected, state]);

  useEffect(() => {
    const now = performance.now();
    const previousElapsed = previousElapsedRef.current;
    const reset = previousElapsed !== null && state.elapsed < previousElapsed;
    const duration = motionDurationForSnapshots(previousElapsed, state.elapsed);
    const previousMotions = unitMotionsRef.current;
    const nextMotions = new Map<number, UnitMotion>();

    for (const unit of state.units) {
      const previous = previousMotions.get(unit.id);
      const jumped = previous && Math.hypot(previous.toX - unit.x, previous.toY - unit.y) > CELL_SIZE * 8;
      if (!previous || reset || jumped) {
        nextMotions.set(unit.id, stationaryUnitMotion(unit, now));
      } else if (previous.toX === unit.x && previous.toY === unit.y) {
        nextMotions.set(unit.id, previous);
      } else {
        nextMotions.set(unit.id, retargetUnitMotion(previous, unit, now, duration));
      }
    }

    unitMotionsRef.current = nextMotions;
    previousElapsedRef.current = state.elapsed;
    snapshotAtRef.current = now;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !art) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimate = !reducedMotion && state.status === "playing" && (state.units.length > 0 || state.effects.length > 0);
    let animationFrame = 0;
    let active = true;

    const drawFrame = (now: number) => {
      const snapshotAge = reducedMotion ? 0 : Math.max(0, Math.min(.25, (now - snapshotAtRef.current) / 1000));
      const renderState: GameState = {
        ...state,
        elapsed: state.elapsed + snapshotAge,
        units: state.units.map((unit) => {
          const position = reducedMotion ? unit : sampleUnitMotion(unitMotionsRef.current.get(unit.id) ?? stationaryUnitMotion(unit, now), now);
          return { ...unit, ...position, attackFlash: Math.max(0, unit.attackFlash - snapshotAge) };
        }),
        buildings: state.buildings.map((building) => {
          const commander = commanderForBuilding(building);
          const running = !building.productionPaused && !state.syncEnabled[commander];
          return running ? { ...building, spawnClock: Math.max(0, building.spawnClock - snapshotAge) } : building;
        }),
        effects: state.effects.map((effect) => ({ ...effect, life: effect.life - snapshotAge })).filter((effect) => effect.life > 0),
      };

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "rgba(10, 16, 9, .055)";
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      drawGrid(context, renderState, "player", false);
      drawGrid(context, renderState, "enemy", false);
      if (selected) drawGrid(context, renderState, localTeam, true, buildAreasForCommander(renderState, localCommander));

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
          context.globalAlpha = .72;
          const dimensions = buildingDimensions({ kind: selected } as Building);
          const centerX = (hover.x + spec.width / 2) * CELL_SIZE;
          const groundY = (hover.y + spec.height) * CELL_SIZE + 8;
          drawAtlasCell(context, art.factions[renderState.factions[localCommander]], spec.atlasIndex, centerX, groundY - dimensions.height / 2, dimensions.width, dimensions.height, false, 4, 4);
          context.restore();
        }
      }

      drawKeep(context, renderState, "player", art.keeps.player);
      drawKeep(context, renderState, "enemy", art.keeps.enemy);

      const fieldObjects: Array<{ y: number; draw: () => void }> = [];
      for (const building of renderState.buildings) {
        const spec = BUILDING_SPECS[building.kind];
        fieldObjects.push({
          y: (building.gridY + spec.height) * CELL_SIZE,
          draw: () => drawBuilding(context, renderState, building, art.factions[renderState.factions[commanderForBuilding(building)]], selectedBuildingId === building.id),
        });
      }
      for (const unit of renderState.units) {
        fieldObjects.push({
          y: unit.y,
          draw: () => drawUnit(context, renderState, unit, art.factions[renderState.factions[commanderForUnit(unit)]]),
        });
      }
      fieldObjects.sort((left, right) => left.y - right.y).forEach((object) => object.draw());
      drawEffects(context, renderState);

      if (active && shouldAnimate) animationFrame = window.requestAnimationFrame(drawFrame);
    };

    drawFrame(performance.now());
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [art, hover, hoverValidation, localCommander, localTeam, renderScale, selected, selectedBuildingId, state]);

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
    else onHoverMessage(validatePlacement(state, localCommander, selected, cell.x, cell.y).reason);
  };

  const commitPlacement = () => {
    if (!selected || !hover) return;
    const validation = validatePlacement(state, localCommander, selected, hover.x, hover.y);
    onHoverMessage(validation.reason);
    if (validation.valid) onPlace(selected, hover.x, hover.y);
  };

  const selectAtCell = (cell: GridPoint) => {
    const hit = [...state.buildings].reverse().find((building) => {
      if (commanderForBuilding(building) !== localCommander) return false;
      const spec = BUILDING_SPECS[building.kind];
      return cell.x >= building.gridX && cell.x < building.gridX + spec.width && cell.y >= building.gridY && cell.y < building.gridY + spec.height;
    });
    onSelectBuilding(hit?.id ?? null);
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
    viewport.scrollBy({ left: viewport.clientWidth * .72 * direction, behavior: "smooth" });
  };

  const moveCameraTo = (ratio: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.scrollTo({ left: (viewport.scrollWidth - viewport.clientWidth) * ratio, behavior });
  };

  const cameraLabel = scrollRatio < .18 ? `${FACTIONS[state.factions.player].name.toUpperCase()} YARD` : scrollRatio > .82 ? `${FACTIONS[state.factions.enemy].name.toUpperCase()} YARD` : "CONTESTED ROAD";

  return (
    <div className="battlefield-frame">
      {(!art || !mapReady) && <div className="battlefield-loading"><span />Preparing the Twin Yards…</div>}
      <div ref={scrollRef} className="battlefield-scroll" onScroll={updateScrollRatio}>
        <div className="battlefield-world">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="battlefield-map" src="/game/battlefield-panorama.png" alt="" draggable={false} onLoad={() => setMapReady(true)} />
          <canvas
            ref={canvasRef}
            width={Math.round(WORLD_WIDTH * renderScale)}
            height={Math.round(WORLD_HEIGHT * renderScale)}
            className={selected ? "battlefield-canvas is-building" : "battlefield-canvas"}
            aria-label="A double-width battlefield. Scroll horizontally, choose a structure below, place it in your illuminated construction yard, or click one of your structures to inspect and upgrade it."
            tabIndex={0}
            onPointerMove={(event) => updateHover(cellFromPointer(event))}
            onPointerLeave={() => updateHover(null)}
            onPointerDown={(event) => { if (event.button === 2) onCancelSelection(); }}
            onClick={(event) => {
              const cell = cellFromPointer(event);
              updateHover(cell);
              if (!selected) { selectAtCell(cell); return; }
              const validation = validatePlacement(state, localCommander, selected, cell.x, cell.y);
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
              const localArea = buildAreasForCommander(state, localCommander)[0];
              const origin = hover ?? { x: localArea.minX + 1, y: localArea.minY + 1, source: "keyboard" as const };
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
          <input type="range" min="0" max="100" value={Math.round(scrollRatio * 100)} onChange={(event) => moveCameraTo(Number(event.target.value) / 100, "auto")} aria-label="Battlefield horizontal position" />
          <small>A / D · WHEEL · SWIPE</small>
        </label>
        <button onClick={() => panCamera(1)} aria-label="Scroll battlefield right">›</button>
      </div>
    </div>
  );
}
