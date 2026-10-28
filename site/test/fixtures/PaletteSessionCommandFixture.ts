/** Valid and invalid palette command candidates for admission tests. */
export class PaletteSessionCommandFixture {
  public static valid(): Record<string, unknown>[] {
    const tuning = {
      'algorithm': 'delta-e',
      'chromaRange': [[0, 0.5]],
      'deltaECap': 128,
      'harmonizeThreshold': 10,
      'histogramBits': 5,
      'k': 8,
      'lightnessRange': [[0, 1]]
    };
    const result = [
      { 'interaction': 'palette.seed.set', 'payload': { 'hex': '#123456', 'index': 0 } },
      { 'interaction': 'palette.seed.add', 'payload': { 'hex': '#abcdef' } },
      { 'interaction': 'palette.seed.remove', 'payload': { 'index': 1 } },
      { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
      { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0 } },
      { 'interaction': 'palette.seeds.replace', 'payload': { 'hexes': ['#000000', '#ffffff'] } },
      { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } },
      { 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } },
      { 'interaction': 'palette.color-space.select', 'payload': { 'colorSpace': 'displayP3' } },
      { 'interaction': 'palette.contrast.strictness.select', 'payload': { 'strictness': 1 } },
      { 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } },
      { 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'enforce' } },
      { 'interaction': 'palette.non-mandatory-level.select', 'payload': { 'nonMandatoryLevel': 'AAA' } },
      { 'interaction': 'palette.image.tuning.set', 'payload': { 'settings': tuning } },
      { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } },
      { 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1', 'name': 'a.png', 'source': 'blob:a' } },
      { 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': 'img-1' } },
      { 'interaction': 'palette.image.entry.settings.set', 'payload': { 'imageId': 'img-1', 'settings': tuning } },
      { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': 'k-means' } },
      { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1' } },
      { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#112233', '#445566'], 'label': 'k-means' } },
      { 'interaction': 'palette.image.entry.extracted', 'payload': { 'imageId': 'img-1', 'result': { 'candidates': [], 'dominantColorRecords': [], 'histogram': [] } } },
      { 'interaction': 'palette.image.entry.failed', 'payload': { 'imageId': 'img-1', 'message': 'decode failed' } },
      { 'interaction': 'palette.image.combine.request', 'payload': {} },
      { 'interaction': 'palette.image.combine.lock.select', 'payload': { 'enableCombineLock': true } },
      { 'interaction': 'palette.image.combine.applied', 'payload': { 'result': { 'candidates': [], 'extracted': ['#112233'], 'histogram': [] } } },
      { 'interaction': 'palette.image.combine.failed', 'payload': { 'message': 'combine failed' } }
    ];
    return result;
  }

  public static invalid(): { 'label': string; 'value': Record<string, unknown> }[] {
    const result = [
      { 'label': 'unknown interaction', 'value': { 'interaction': 'palette.hues.select', 'payload': {} } },
      { 'label': 'missing payload', 'value': { 'interaction': 'palette.seed.add' } },
      { 'label': 'malformed hex', 'value': { 'interaction': 'palette.seed.add', 'payload': { 'hex': 'red' } } },
      { 'label': 'negative index', 'value': { 'interaction': 'palette.seed.remove', 'payload': { 'index': -1 } } },
      { 'label': 'fractional index', 'value': { 'interaction': 'palette.seed.set', 'payload': { 'hex': '#123456', 'index': 0.5 } } },
      { 'label': 'unknown schema', 'value': { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-3' } } },
      { 'label': 'unknown framing', 'value': { 'interaction': 'palette.framing.select', 'payload': { 'framing': 'dim' } } },
      { 'label': 'strictness above range', 'value': { 'interaction': 'palette.contrast.strictness.select', 'payload': { 'strictness': 3 } } },
      { 'label': 'non-boolean toggle', 'value': { 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': 'yes' } } },
      { 'label': 'unknown cvd mode', 'value': { 'interaction': 'palette.cvd-mode.select', 'payload': { 'cvdMode': 'ignore' } } },
      { 'label': 'unknown level', 'value': { 'interaction': 'palette.non-mandatory-level.select', 'payload': { 'nonMandatoryLevel': 'A' } } },
      { 'label': 'empty replacement', 'value': { 'interaction': 'palette.seeds.replace', 'payload': { 'hexes': [] } } },
      { 'label': 'extra payload property', 'value': { 'interaction': 'palette.seed.remove', 'payload': { 'extra': true, 'index': 0 } } },
      { 'label': 'semantic hue command', 'value': { 'interaction': 'palette.semantic-hues.select', 'payload': { 'hues': {} } } },
      { 'label': 'unknown mode', 'value': { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'camera' } } },
      { 'label': 'empty image id', 'value': { 'interaction': 'palette.image.entry.remove', 'payload': { 'imageId': '' } } },
      { 'label': 'combine request carrying hexes', 'value': { 'interaction': 'palette.image.combine.request', 'payload': { 'hexes': ['#112233'] } } },
      { 'label': 'empty candidate label', 'value': { 'interaction': 'palette.image.entry.candidate.select', 'payload': { 'imageId': 'img-1', 'label': '' } } },
      { 'label': 'candidate selection without hexes', 'value': { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': [], 'label': 'k-means' } } },
      { 'label': 'candidate selection without a label', 'value': { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#112233'] } } },
      { 'label': 'candidate selection with an empty label', 'value': { 'interaction': 'palette.image.candidate.select', 'payload': { 'hexes': ['#112233'], 'label': '' } } },
      { 'label': 'non-boolean combine lock', 'value': { 'interaction': 'palette.image.combine.lock.select', 'payload': { 'enableCombineLock': 1 } } },
      { 'label': 'malformed extraction result', 'value': { 'interaction': 'palette.image.entry.extracted', 'payload': { 'imageId': 'img-1', 'result': { 'candidates': [] } } } },
      { 'label': 'incomplete entry add', 'value': { 'interaction': 'palette.image.entry.add', 'payload': { 'imageId': 'img-1' } } },
      { 'label': 'incomplete tuning', 'value': { 'interaction': 'palette.image.tuning.set', 'payload': { 'settings': { 'k': 8 } } } }
    ];
    return result;
  }
}
