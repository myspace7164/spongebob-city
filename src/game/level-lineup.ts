import { levelLibrary, levelLineup } from "../../config/built-levels/index.ts";
import {
  baselLocations,
  levelLocationPools,
} from "../../config/level-locations.ts";
import { cityLevels, withBuilt } from "../../config/levels.ts";
import type { CityLevel, LevelLineup, LibraryLevel } from "../interfaces.ts";
import { checkLayout } from "./level-builder.ts";

const libraryPrefix = "library:";
const baselPrefix = "basel:";

/** Campaign location id for a library level. */
export const libraryLocation = (id: string) => `${libraryPrefix}${id}`;

/** Why a library level cannot be the given stage; empty when it fits. */
export function stageProblems(level: LibraryLevel, stage: CityLevel): string[] {
  return checkLayout(level.spots, stage.goals);
}

/** A library level only plays a stage whose goals its spots can reach. */
export const fitsStage = (level: LibraryLevel, stage: CityLevel) =>
  stageProblems(level, stage).length === 0;

const pick = <T>(items: readonly T[], random: () => number): T =>
  items[
    Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  ];

/** The stage's lineup choice if it still fits, otherwise a random built-in Basel street. */
export function stageLocation(
  stageIndex: number,
  random: () => number,
  lineup: LevelLineup = levelLineup,
  library: Record<string, LibraryLevel> = levelLibrary,
): string {
  const street = pick(levelLocationPools[stageIndex], random).id;
  const chosen = library[lineup.stages[cityLevels[stageIndex].id] ?? ""];
  return chosen && fitsStage(chosen, cityLevels[stageIndex])
    ? libraryLocation(chosen.id)
    : street;
}

/** One place endless mode may pick, with the stage whose rules it plays. */
export interface EndlessEntry {
  /** Switch id stored in LevelLineup.endlessOff. */
  id: string;
  stageIndex: number;
  /** Campaign location id (Basel location id or "library:<id>"). */
  location: string;
  name: string;
  /** GitHub username for library levels; absent for built-in streets. */
  author?: string;
  notes?: string;
  enabled: boolean;
}

/** Every built-in street (its tier's stage) and every library level that fits the stage it was built for. */
export function endlessEntries(
  lineup: LevelLineup = levelLineup,
  library: Record<string, LibraryLevel> = levelLibrary,
): EndlessEntry[] {
  const off = new Set(lineup.endlessOff);
  const streets = levelLocationPools.flatMap((pool, stageIndex) =>
    pool.map((street) => ({
      id: `${baselPrefix}${street.id}`,
      stageIndex,
      location: street.id,
      name: street.name,
    })),
  );
  const built = Object.values(library)
    .sort(
      (a, b) =>
        a.location.localeCompare(b.location) || a.id.localeCompare(b.id),
    )
    .flatMap((level) => {
      const stageIndex = cityLevels.findIndex(
        (stage) => stage.id === level.builtFor,
      );
      if (stageIndex < 0 || !fitsStage(level, cityLevels[stageIndex]))
        return [];
      return [
        {
          id: libraryLocation(level.id),
          stageIndex,
          location: libraryLocation(level.id),
          name: level.location,
          author: level.author,
          notes: level.notes,
        },
      ];
    });
  return [...streets, ...built].map((entry) => ({
    ...entry,
    enabled: !off.has(entry.id),
  }));
}

/** Endless picks from the switched-on entries; with all off it uses every entry. */
export function pickEndlessEntry(
  random: () => number,
  lineup: LevelLineup = levelLineup,
  library: Record<string, LibraryLevel> = levelLibrary,
): EndlessEntry {
  const entries = endlessEntries(lineup, library);
  const enabled = entries.filter((entry) => entry.enabled);
  return pick(enabled.length ? enabled : entries, random);
}

/** A stage played at a campaign location; undefined when the id is unknown. */
export function levelAtLocation(
  stage: CityLevel,
  location: string | undefined,
  library: Record<string, LibraryLevel> = levelLibrary,
): CityLevel | undefined {
  if (location?.startsWith(libraryPrefix)) {
    const level = library[location.slice(libraryPrefix.length)];
    return level ? withBuilt(stage, level) : undefined;
  }
  const street = baselLocations.find((site) => site.id === location);
  return street
    ? { ...stage, location: street.name, mapSite: street.site }
    : undefined;
}
