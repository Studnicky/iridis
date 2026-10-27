import type { PaletteInteractionCommandEntity } from './entities/PaletteInteractionCommandEntity.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionEntryOutcomeInterface } from './interfaces/PaletteSessionEntryOutcomeInterface.ts';

import { IRIDIS_CONSTANTS } from '../constants/IridisConstants.ts';
import { ImageExtractionResultEntity } from '../entities/ImageExtractionResultEntity.ts';
import { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';
import { PaletteSessionImageEntryEntity } from './entities/PaletteSessionImageEntryEntity.ts';

/** Reduces admitted commands onto the image-intake state and derives the combine inputs from the session's own entries. */
export class PaletteSessionImage {
  /** The weighted hex multiset the combine lane receives; empty when no entry contributes colours. */
  public static combineHexes(image: PaletteSessionImageEntity.Type): string[] {
    const weighted = image.entries.flatMap((entry) => {
      const contribution = PaletteSessionImage.contribution(entry);
      return contribution;
    });
    const result = PaletteSessionImage.expand(weighted, IRIDIS_CONSTANTS.CUMULATIVE_HISTOGRAM_BUDGET);
    return result;
  }

  /** The entry a command asks the extract lane to process, read from the reduced state. */
  public static extractionFor(image: PaletteSessionImageEntity.Type, command: PaletteInteractionCommandEntity.Type): PaletteSessionImageEntity.Type['entries'][number] | undefined {
    let result: PaletteSessionImageEntity.Type['entries'][number] | undefined;
    if (command.interaction === 'palette.image.entry.add' || command.interaction === 'palette.image.entry.settings.set') {
      result = PaletteSessionImage.find(image, command.payload.imageId);
    }
    return result;
  }

  public static initial(): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImageEntity.create({
      'candidates': [],
      'combine': { 'status': 'idle' },
      'enableCombineLock': false,
      'entries': [],
      'histogram': []
    });
    return result;
  }

  public static reduce(
    image: PaletteSessionImageEntity.Type,
    command: PaletteInteractionCommandEntity.Type,
    input: PaletteSessionInputEntity.Type
  ): PaletteSessionImageEntity.Type {
    const changed = PaletteSessionImage.apply(image, command, input);
    const combining = PaletteSessionImage.requestsCombine(image, command) && PaletteSessionImage.combineHexes(changed).length > 0;
    const result = combining ? PaletteSessionImage.combining(changed) : changed;
    return result;
  }

  /** Whether the command, applied to `image`, sends the combine lane a request; the lock suppresses every trigger except an explicit request. */
  public static requestsCombine(image: PaletteSessionImageEntity.Type, command: PaletteInteractionCommandEntity.Type): boolean {
    let result = false;
    if (command.interaction === 'palette.image.combine.request') {
      result = true;
    } else if (command.interaction === 'palette.image.tuning.set') {
      result = !image.enableCombineLock;
    } else if (
      command.interaction === 'palette.image.entry.candidate.select'
      || command.interaction === 'palette.image.entry.extracted'
      || command.interaction === 'palette.image.entry.remove'
    ) {
      result = !image.enableCombineLock && PaletteSessionImage.find(image, command.payload.imageId) !== undefined;
    }
    return result;
  }

  private static apply(
    image: PaletteSessionImageEntity.Type,
    command: PaletteInteractionCommandEntity.Type,
    input: PaletteSessionInputEntity.Type
  ): PaletteSessionImageEntity.Type {
    let result = PaletteSessionImage.applyEntry(image, command, input);
    if (command.interaction === 'palette.image.combine.lock.select') {
      result = PaletteSessionImageEntity.intake({ ...image, 'enableCombineLock': command.payload.enableCombineLock });
    } else if (command.interaction === 'palette.image.combine.applied') {
      const combined = command.payload.result;
      result = PaletteSessionImage.combineIdle(
        PaletteSessionImageEntity.intake({ ...image, 'candidates': combined.candidates, 'histogram': combined.histogram })
      );
    } else if (command.interaction === 'palette.image.combine.failed') {
      result = PaletteSessionImage.combineFailed(image, command.payload.message);
    }
    return result;
  }

  private static applyEntry(
    image: PaletteSessionImageEntity.Type,
    command: PaletteInteractionCommandEntity.Type,
    input: PaletteSessionInputEntity.Type
  ): PaletteSessionImageEntity.Type {
    let result = image;
    if (command.interaction === 'palette.image.entry.add') {
      result = PaletteSessionImage.addEntry(image, command.payload, input);
    } else if (command.interaction === 'palette.image.entry.remove') {
      result = PaletteSessionImage.withEntries(image, image.entries.filter((entry) => {
        const kept = entry.id !== command.payload.imageId;
        return kept;
      }));
    } else if (command.interaction === 'palette.image.entry.settings.set') {
      result = PaletteSessionImage.mapEntry(image, command.payload.imageId, (entry) => {
        const extracting = PaletteSessionImage.rebuild(entry, { 'error': undefined, 'label': entry.selectedCandidateLabel, 'status': 'extracting' });
        const next = PaletteSessionImageEntryEntity.intake({ ...extracting, 'settings': command.payload.settings });
        return next;
      });
    } else if (command.interaction === 'palette.image.entry.candidate.select') {
      result = PaletteSessionImage.mapEntry(image, command.payload.imageId, (entry) => {
        const next = PaletteSessionImage.rebuild(entry, { 'error': entry.error, 'label': command.payload.label, 'status': entry.status });
        return next;
      });
    } else if (command.interaction === 'palette.image.entry.extracted') {
      result = PaletteSessionImage.mapEntry(image, command.payload.imageId, (entry) => {
        const next = PaletteSessionImage.rebuild(entry, {
          'error': undefined,
          'extraction': ImageExtractionResultEntity.intake(command.payload.result),
          'label': entry.selectedCandidateLabel,
          'status': 'idle'
        });
        return next;
      });
    } else if (command.interaction === 'palette.image.entry.failed') {
      result = PaletteSessionImage.mapEntry(image, command.payload.imageId, (entry) => {
        const next = PaletteSessionImage.rebuild(entry, { 'error': command.payload.message, 'label': entry.selectedCandidateLabel, 'status': 'failed' });
        return next;
      });
    }
    return result;
  }

  private static addEntry(
    image: PaletteSessionImageEntity.Type,
    payload: { 'imageId': string; 'name': string; 'source': string },
    input: PaletteSessionInputEntity.Type
  ): PaletteSessionImageEntity.Type {
    let result = image;
    if (PaletteSessionImage.find(image, payload.imageId) === undefined) {
      const entry = PaletteSessionImageEntryEntity.intake({
        'candidates': [],
        'dominantColorRecords': [],
        'histogram': [],
        'id': payload.imageId,
        'name': payload.name,
        'settings': input.imageTuning,
        'source': payload.source,
        'status': 'extracting'
      });
      result = PaletteSessionImage.withEntries(image, [...image.entries, entry]);
    }
    return result;
  }

  /** The weighted colours an entry contributes: its chosen candidate when that label still exists, otherwise its dominant colours. */
  private static contribution(entry: PaletteSessionImageEntity.Type['entries'][number]): readonly { 'hex': string; 'weight': number }[] {
    const match = entry.candidates.find((candidate) => {
      const chosen = Object.is(candidate.label, entry.selectedCandidateLabel);
      return chosen;
    });
    const result = match === undefined
      ? entry.dominantColorRecords
      : match.colors.map((color) => {
        const weighted = { 'hex': color.hex, 'weight': color.hints?.weight ?? 1 };
        return weighted;
      });
    return result;
  }

  /** Repeats each hex in proportion to its share of the total weight, so a plain frequency count rebuilds a pixel-weighted histogram. */
  private static expand(weighted: readonly { 'hex': string; 'weight': number }[], budget: number): string[] {
    const total = weighted.reduce((sum, color) => {
      const next = sum + color.weight;
      return next;
    }, 0);
    const result: string[] = [];
    for (let index = 0; index < weighted.length; index += 1) {
      const color = weighted[index];
      const count = total > 0 && color !== undefined ? Math.max(1, Math.round((color.weight / total) * budget)) : 1;
      for (let occurrence = 0; color !== undefined && occurrence < count; occurrence += 1) {
        result.push(color.hex);
      }
    }
    return result;
  }

  private static find(image: PaletteSessionImageEntity.Type, imageId: string): PaletteSessionImageEntity.Type['entries'][number] | undefined {
    const result = image.entries.find((entry) => {
      const matches = entry.id === imageId;
      return matches;
    });
    return result;
  }

  private static mapEntry(
    image: PaletteSessionImageEntity.Type,
    imageId: string,
    update: (entry: PaletteSessionImageEntity.Type['entries'][number]) => PaletteSessionImageEntity.Type['entries'][number]
  ): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImage.withEntries(image, image.entries.map((entry) => {
      const next = entry.id === imageId ? update(entry) : entry;
      return next;
    }));
    return result;
  }

  /** Rebuilds an entry so optional fields are present only when they hold a value. */
  private static rebuild(entry: PaletteSessionImageEntity.Type['entries'][number], outcome: PaletteSessionEntryOutcomeInterface): PaletteSessionImageEntryEntity.Type {
    const result = PaletteSessionImageEntryEntity.intake({
      'candidates': outcome.extraction?.candidates ?? entry.candidates,
      'dominantColorRecords': outcome.extraction?.dominantColorRecords ?? entry.dominantColorRecords,
      ...(outcome.error === undefined ? {} : { 'error': outcome.error }),
      'histogram': outcome.extraction?.histogram ?? entry.histogram,
      'id': entry.id,
      'name': entry.name,
      ...(outcome.label === undefined ? {} : { 'selectedCandidateLabel': outcome.label }),
      'settings': entry.settings,
      'source': entry.source,
      'status': outcome.status
    });
    return result;
  }

  private static combineFailed(image: PaletteSessionImageEntity.Type, message: string): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImageEntity.intake({ ...image, 'combine': { 'error': message, 'status': 'failed' } });
    return result;
  }

  private static combineIdle(image: PaletteSessionImageEntity.Type): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImageEntity.intake({ ...image, 'combine': { 'status': 'idle' } });
    return result;
  }

  private static combining(image: PaletteSessionImageEntity.Type): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImageEntity.intake({ ...image, 'combine': { 'status': 'combining' } });
    return result;
  }

  private static withEntries(image: PaletteSessionImageEntity.Type, entries: readonly PaletteSessionImageEntity.Type['entries'][number][]): PaletteSessionImageEntity.Type {
    const result = PaletteSessionImageEntity.intake({ ...image, 'entries': entries });
    return result;
  }
}
