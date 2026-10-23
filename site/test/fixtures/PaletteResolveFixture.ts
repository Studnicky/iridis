export class PaletteResolveFixture {
  public static request() {
    const result = ({
      'colorSpace': 'srgb',
      'cvdMode': 'nudge',
      'derivationConfig': ({
        'relations': ({
          'success': ({
            'algorithm': 'analogous',
            'hueVariantIndex': 1
          })
        })
      }),
      'enableStrictCompliance': false,
      'framing': 'dark',
      'nonMandatoryLevel': 'AA',
      'schemaName': 'iridis-8',
      'seeds': ([
        ({
          'hex': '#7c3aed',
          'role': 'brand'
        }),
        ({ 'hex': '#06b6d4' })
      ]),
      'semanticHuesEnabled': true,
      'strictness': 2
    });
    return result;
  }

  public static snapshot() {
    const result = ({
      'clamps': ([({
        'resolvedHex': '#112233',
        'roleName': 'brand',
        'roleOklch': 'L 0.30 · C 0.05 · H 250',
        'seedHex': '#445566',
        'seedOklch': 'L 0.50 · C 0.04 · H 260'
      })]),
      'compliance': ({
        'compliant': false,
        'cvdCompliant': false,
        'pairs': ([]),
        'problemPairs': ([({
          'actual': 2.5,
          'adjustedRoles': ([]),
          'background': 'surface',
          'causes': (['solver-exhausted']),
          'cvd': ([]),
          'disposition': 'best-effort',
          'foreground': 'accent',
          'passed': false,
          'required': 3,
          'shortfall': 0.5
        })]),
        'selected': ({
          'algorithm': 'apca',
          'level': 'Lc'
        }),
        'withheld': false
      }),
      'cvd': ({
        'blocked': ([]),
        'corrections': ([]),
        'warnings': ([])
      }),
      'distances': ({ 'brand': ({ '#445566': 0.12 }) }),
      'provenance': ({
        'derived': (['success']),
        'pinned': (['brand']),
        'synthesized': ([])
      }),
      'roles': ([
        ({
          'c': 0.05,
          'displayP3': ({
            'b': 0.2,
            'g': 0.1,
            'r': 0.05
          }),
          'h': 250,
          'hex': '#112233',
          'l': 0.3,
          'name': 'brand'
        }),
        ({
          'c': 0.01,
          'h': 90,
          'hex': '#fafafa',
          'l': 0.98,
          'name': 'background'
        })
      ]),
      'scales': ({
        '500': ({
          'background': '#fafafa',
          'brand': '#112233'
        })
      })
    });
    return result;
  }
}
