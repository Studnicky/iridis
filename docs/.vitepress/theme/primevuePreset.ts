/**
 * primevuePreset.ts — iridis-aware PrimeVue design preset.
 *
 * PrimeVue v4 ships its theme as a set of CSS variables (--p-*) generated
 * from a token tree. The default presets (Aura, Lara, Material, Nora)
 * provide a complete tree; consumers override the parts they want to
 * theme. This preset takes Aura as a base and rewires the primary +
 * surface scales so PrimeVue's chrome reads from the iridis engine's
 * --iridis-* output.
 *
 *   iridis engine → --iridis-brand / --iridis-surface / etc.
 *   primevuePreset → --p-primary-{50..950} / --p-surface-{0..950} = var()
 *   PrimeVue components → paint with --p-* (which now resolve to iridis)
 *
 * Pick a palette in the right panel; --iridis-brand mutates; every
 * PrimeVue Button/Card/Select/etc. on the page re-tints in the next
 * paint with no JS re-render.
 *
 * The scale entries (50, 100, ..., 950) are filled with color-mix
 * compositions of var(--iridis-brand) against var(--iridis-bg-soft) /
 * var(--iridis-text), giving the dark→light spread PrimeVue expects
 * from a single brand seed. 500 is the unmixed brand.
 *
 * Surface scale is filled from --iridis-background / --iridis-surface /
 * --iridis-bg-soft / --iridis-divider / --iridis-text via the same
 * pattern. Light/dark colorScheme slots use the same vars; the iridis
 * engine handles the framing flip server-side via role schemas, so
 * the two schemes converge on identical CSS expressions.
 */

import { definePreset } from '@primeuix/themes';
import Aura             from '@primeuix/themes/aura';

/**
 * Compose a color-mix expression between var(--iridis-brand) and a
 * neutral anchor (bg-soft for dark tones, text for light). Returns a
 * raw CSS value PrimeVue writes verbatim into its CSS variable.
 *
 * @param brandPct  Percentage of the brand color in the mix (0..100).
 * @param anchor    The neutral side of the mix — bgSoft for lights and
 *                  text for darks gives a perceptually balanced ramp.
 */
function brandStep(brandPct: number, anchor: 'bg-soft' | 'text'): string {
  return `color-mix(in oklch, var(--iridis-brand) ${brandPct}%, var(--iridis-${anchor}))`;
}

/**
 * Compose a color-mix expression on the surface ramp: anchors
 * --iridis-background and steps toward --iridis-text via the
 * percentage. Gives PrimeVue's surface scale a continuous gradient
 * out of the engine's two extremes.
 */
function surfaceStep(textPct: number): string {
  return `color-mix(in oklch, var(--iridis-text) ${textPct}%, var(--iridis-background))`;
}

export const iridisPreset = definePreset(Aura, {
  'semantic': {
    'transitionDuration': '0.18s',
    'focusRing': {
      'width':  '2px',
      'style':  'solid',
      'color':  'var(--iridis-brand)',
      'offset': '2px',
      'shadow': 'none',
    },
    'disabledOpacity': '0.4',
    'iconSize':        '1rem',
    'anchorGutter':    '2px',
    'primary': {
      '50':  brandStep(8,  'bg-soft'),
      '100': brandStep(16, 'bg-soft'),
      '200': brandStep(28, 'bg-soft'),
      '300': brandStep(44, 'bg-soft'),
      '400': brandStep(72, 'bg-soft'),
      '500': 'var(--iridis-brand)',
      '600': brandStep(82, 'text'),
      '700': brandStep(64, 'text'),
      '800': brandStep(46, 'text'),
      '900': brandStep(28, 'text'),
      '950': brandStep(14, 'text'),
    },
    'formField': {
      'paddingX':         '0.6rem',
      'paddingY':         '0.4rem',
      'sm': { 'fontSize': '0.78rem', 'paddingX': '0.45rem', 'paddingY': '0.32rem' },
      'lg': { 'fontSize': '0.95rem', 'paddingX': '0.75rem', 'paddingY': '0.55rem' },
      'borderRadius':       'var(--iridis-radius)',
      'transitionDuration': 'var(--iridis-transition, 0.18s)',
      'focusRing': {
        'width':  '0',
        'style':  'none',
        'color':  'transparent',
        'offset': '0',
        'shadow': 'none',
      },
    },
    'colorScheme': {
      'light': {
        'surface': {
          '0':   'var(--iridis-background)',
          '50':  'var(--iridis-bg-soft, var(--iridis-surface, var(--iridis-background)))',
          '100': 'var(--iridis-surface,  var(--iridis-bg-soft, var(--iridis-background)))',
          '200': 'var(--iridis-divider,  var(--iridis-muted, var(--iridis-background)))',
          '300': surfaceStep(18),
          '400': 'var(--iridis-muted, ' + surfaceStep(35) + ')',
          '500': surfaceStep(50),
          '600': surfaceStep(64),
          '700': surfaceStep(75),
          '800': surfaceStep(86),
          '900': 'var(--iridis-text, ' + surfaceStep(95) + ')',
          '950': surfaceStep(100),
        },
        'primary': {
          'color':         'var(--iridis-brand)',
          'contrastColor': 'var(--iridis-on-brand, var(--iridis-background))',
          'hoverColor':    'color-mix(in oklch, var(--iridis-brand) 88%, var(--iridis-text))',
          'activeColor':   'color-mix(in oklch, var(--iridis-brand) 72%, var(--iridis-text))',
        },
        'highlight': {
          'background':      'color-mix(in oklch, var(--iridis-brand) 14%, var(--iridis-bg-soft, transparent))',
          'focusBackground': 'color-mix(in oklch, var(--iridis-brand) 24%, var(--iridis-bg-soft, transparent))',
          'color':           'var(--iridis-brand)',
          'focusColor':      'var(--iridis-brand)',
        },
        'mask': {
          'background': 'color-mix(in oklch, var(--iridis-text) 40%, transparent)',
          'color':      'var(--iridis-bg-soft, var(--iridis-surface))',
        },
        'formField': {
          'background':              'var(--iridis-bg-soft, var(--iridis-surface, var(--iridis-background)))',
          'disabledBackground':      'var(--iridis-surface, var(--iridis-background))',
          'filledBackground':        'var(--iridis-bg-soft, var(--iridis-surface))',
          'filledHoverBackground':   'var(--iridis-surface)',
          'filledFocusBackground':   'var(--iridis-bg-soft, var(--iridis-surface))',
          'borderColor':             'var(--iridis-divider, var(--iridis-muted, currentColor))',
          'hoverBorderColor':        'color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider))',
          'focusBorderColor':        'var(--iridis-brand)',
          'invalidBorderColor':      'var(--iridis-error, var(--iridis-brand))',
          'color':                   'var(--iridis-text)',
          'disabledColor':           'var(--iridis-muted, var(--iridis-text))',
          'placeholderColor':        'var(--iridis-muted, var(--iridis-text))',
          'invalidPlaceholderColor': 'var(--iridis-error, var(--iridis-muted))',
          'floatLabelColor':         'var(--iridis-muted, var(--iridis-text))',
          'floatLabelFocusColor':    'var(--iridis-brand)',
          'floatLabelActiveColor':   'var(--iridis-muted)',
          'floatLabelInvalidColor':  'var(--iridis-error, var(--iridis-muted))',
          'iconColor':               'var(--iridis-muted, var(--iridis-text))',
          'shadow':                  'var(--iridis-card-shadow-pressed, none)',
        },
        'text': {
          'color':           'var(--iridis-text)',
          'hoverColor':      'var(--iridis-text)',
          'mutedColor':      'var(--iridis-muted, var(--iridis-text))',
          'hoverMutedColor': 'var(--iridis-text)',
        },
        'content': {
          'background':      'var(--iridis-surface, var(--iridis-background))',
          'hoverBackground': 'var(--iridis-bg-soft, var(--iridis-surface))',
          'borderColor':     'var(--iridis-divider, var(--iridis-muted))',
          'color':           'var(--iridis-text)',
          'hoverColor':      'var(--iridis-text)',
        },
        'overlay': {
          'select':  { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
          'popover': { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
          'modal':   { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
        },
        'list': {
          'option': {
            'focusBackground':         'var(--iridis-bg-soft, var(--iridis-surface))',
            'selectedBackground':      'color-mix(in oklch, var(--iridis-brand) 16%, var(--iridis-bg-soft, transparent))',
            'selectedFocusBackground': 'color-mix(in oklch, var(--iridis-brand) 26%, var(--iridis-bg-soft, transparent))',
            'color':                   'var(--iridis-text)',
            'focusColor':              'var(--iridis-text)',
            'selectedColor':           'var(--iridis-brand)',
            'selectedFocusColor':      'var(--iridis-brand)',
            'icon': {
              'color':      'var(--iridis-muted, var(--iridis-text))',
              'focusColor': 'var(--iridis-text)',
            },
          },
          'optionGroup': {
            'background': 'transparent',
            'color':      'var(--iridis-muted, var(--iridis-text))',
          },
        },
        'navigation': {
          'item': {
            'focusBackground':  'var(--iridis-bg-soft, var(--iridis-surface))',
            'activeBackground': 'var(--iridis-bg-soft, var(--iridis-surface))',
            'color':            'var(--iridis-text)',
            'focusColor':       'var(--iridis-text)',
            'activeColor':      'var(--iridis-brand)',
            'icon': {
              'color':       'var(--iridis-muted, var(--iridis-text))',
              'focusColor':  'var(--iridis-text)',
              'activeColor': 'var(--iridis-brand)',
            },
          },
          'submenuLabel': { 'background': 'transparent', 'color': 'var(--iridis-muted, var(--iridis-text))' },
          'submenuIcon':  { 'color': 'var(--iridis-muted, var(--iridis-text))', 'focusColor': 'var(--iridis-text)', 'activeColor': 'var(--iridis-brand)' },
        },
      },
      'dark': {
        'surface': {
          '0':   'var(--iridis-background)',
          '50':  'var(--iridis-bg-soft, var(--iridis-surface, var(--iridis-background)))',
          '100': 'var(--iridis-surface,  var(--iridis-bg-soft, var(--iridis-background)))',
          '200': 'var(--iridis-divider,  var(--iridis-muted, var(--iridis-background)))',
          '300': surfaceStep(18),
          '400': 'var(--iridis-muted, ' + surfaceStep(35) + ')',
          '500': surfaceStep(50),
          '600': surfaceStep(64),
          '700': surfaceStep(75),
          '800': surfaceStep(86),
          '900': 'var(--iridis-text, ' + surfaceStep(95) + ')',
          '950': surfaceStep(100),
        },
        'primary': {
          'color':         'var(--iridis-brand)',
          'contrastColor': 'var(--iridis-on-brand, var(--iridis-background))',
          'hoverColor':    'color-mix(in oklch, var(--iridis-brand) 88%, var(--iridis-text))',
          'activeColor':   'color-mix(in oklch, var(--iridis-brand) 72%, var(--iridis-text))',
        },
        'highlight': {
          'background':      'color-mix(in oklch, var(--iridis-brand) 18%, var(--iridis-bg-soft, transparent))',
          'focusBackground': 'color-mix(in oklch, var(--iridis-brand) 28%, var(--iridis-bg-soft, transparent))',
          'color':           'var(--iridis-brand)',
          'focusColor':      'var(--iridis-brand)',
        },
        'mask': {
          'background': 'color-mix(in oklch, var(--iridis-background) 60%, transparent)',
          'color':      'var(--iridis-bg-soft, var(--iridis-surface))',
        },
        'formField': {
          'background':              'var(--iridis-bg-soft, var(--iridis-surface, var(--iridis-background)))',
          'disabledBackground':      'var(--iridis-surface, var(--iridis-background))',
          'filledBackground':        'var(--iridis-bg-soft, var(--iridis-surface))',
          'filledHoverBackground':   'var(--iridis-surface)',
          'filledFocusBackground':   'var(--iridis-bg-soft, var(--iridis-surface))',
          'borderColor':             'var(--iridis-divider, var(--iridis-muted, currentColor))',
          'hoverBorderColor':        'color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider))',
          'focusBorderColor':        'var(--iridis-brand)',
          'invalidBorderColor':      'var(--iridis-error, var(--iridis-brand))',
          'color':                   'var(--iridis-text)',
          'disabledColor':           'var(--iridis-muted, var(--iridis-text))',
          'placeholderColor':        'var(--iridis-muted, var(--iridis-text))',
          'invalidPlaceholderColor': 'var(--iridis-error, var(--iridis-muted))',
          'floatLabelColor':         'var(--iridis-muted, var(--iridis-text))',
          'floatLabelFocusColor':    'var(--iridis-brand)',
          'floatLabelActiveColor':   'var(--iridis-muted)',
          'floatLabelInvalidColor':  'var(--iridis-error, var(--iridis-muted))',
          'iconColor':               'var(--iridis-muted, var(--iridis-text))',
          'shadow':                  'var(--iridis-card-shadow-pressed, none)',
        },
        'text': {
          'color':           'var(--iridis-text)',
          'hoverColor':      'var(--iridis-text)',
          'mutedColor':      'var(--iridis-muted, var(--iridis-text))',
          'hoverMutedColor': 'var(--iridis-text)',
        },
        'content': {
          'background':      'var(--iridis-surface, var(--iridis-background))',
          'hoverBackground': 'var(--iridis-bg-soft, var(--iridis-surface))',
          'borderColor':     'var(--iridis-divider, var(--iridis-muted))',
          'color':           'var(--iridis-text)',
          'hoverColor':      'var(--iridis-text)',
        },
        'overlay': {
          'select':  { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
          'popover': { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
          'modal':   { 'background': 'var(--iridis-surface, var(--iridis-background))', 'borderColor': 'var(--iridis-divider, var(--iridis-muted))', 'color': 'var(--iridis-text)' },
        },
        'list': {
          'option': {
            'focusBackground':         'var(--iridis-bg-soft, var(--iridis-surface))',
            'selectedBackground':      'color-mix(in oklch, var(--iridis-brand) 18%, var(--iridis-bg-soft, transparent))',
            'selectedFocusBackground': 'color-mix(in oklch, var(--iridis-brand) 28%, var(--iridis-bg-soft, transparent))',
            'color':                   'var(--iridis-text)',
            'focusColor':              'var(--iridis-text)',
            'selectedColor':           'var(--iridis-brand)',
            'selectedFocusColor':      'var(--iridis-brand)',
            'icon': {
              'color':      'var(--iridis-muted, var(--iridis-text))',
              'focusColor': 'var(--iridis-text)',
            },
          },
          'optionGroup': {
            'background': 'transparent',
            'color':      'var(--iridis-muted, var(--iridis-text))',
          },
        },
        'navigation': {
          'item': {
            'focusBackground':  'var(--iridis-bg-soft, var(--iridis-surface))',
            'activeBackground': 'var(--iridis-bg-soft, var(--iridis-surface))',
            'color':            'var(--iridis-text)',
            'focusColor':       'var(--iridis-text)',
            'activeColor':      'var(--iridis-brand)',
            'icon': {
              'color':       'var(--iridis-muted, var(--iridis-text))',
              'focusColor':  'var(--iridis-text)',
              'activeColor': 'var(--iridis-brand)',
            },
          },
          'submenuLabel': { 'background': 'transparent', 'color': 'var(--iridis-muted, var(--iridis-text))' },
          'submenuIcon':  { 'color': 'var(--iridis-muted, var(--iridis-text))', 'focusColor': 'var(--iridis-text)', 'activeColor': 'var(--iridis-brand)' },
        },
      },
    },
  },
  /* Component-level overrides. Maps directly into PrimeVue's
     `--p-{component}-{slot}-{property}` CSS variables; PrimeVue's
     internal scoped CSS reads these tokens, so no specificity fight
     in base.css.

     Aura's togglebutton tokens nest color-scope under
     `colorScheme.{light|dark}.root` and `colorScheme.{light|dark}.content`.
     iridis handles framing flips inside the engine (the same iridis-*
     CSS variables resolve to light or dark depending on the active
     framing), so identical expressions work in both schemes. */
  'components': {
    'togglebutton': {
      'colorScheme': {
        'light': {
          'root': {
            'background':         'var(--iridis-bg-soft, var(--iridis-surface))',
            'hoverBackground':    'color-mix(in oklch, var(--iridis-bg-soft, var(--iridis-surface)) 88%, var(--iridis-brand) 12%)',
            'checkedBackground':  'var(--iridis-text)',
            'borderColor':        'var(--iridis-divider, var(--iridis-muted))',
            'checkedBorderColor': 'var(--iridis-text)',
            'color':              'var(--iridis-muted, var(--iridis-text))',
            'hoverColor':         'var(--iridis-text)',
            'checkedColor':       'var(--iridis-background)',
          },
          'content': {
            'checkedBackground': 'var(--iridis-text)',
          },
          'icon': {
            'color':        'var(--iridis-muted, var(--iridis-text))',
            'hoverColor':   'var(--iridis-text)',
            'checkedColor': 'var(--iridis-background)',
          },
        },
        'dark': {
          'root': {
            'background':         'var(--iridis-bg-soft, var(--iridis-surface))',
            'hoverBackground':    'color-mix(in oklch, var(--iridis-bg-soft, var(--iridis-surface)) 88%, var(--iridis-brand) 12%)',
            'checkedBackground':  'var(--iridis-text)',
            'borderColor':        'var(--iridis-divider, var(--iridis-muted))',
            'checkedBorderColor': 'var(--iridis-text)',
            'color':              'var(--iridis-muted, var(--iridis-text))',
            'hoverColor':         'var(--iridis-text)',
            'checkedColor':       'var(--iridis-background)',
          },
          'content': {
            'checkedBackground': 'var(--iridis-text)',
          },
          'icon': {
            'color':        'var(--iridis-muted, var(--iridis-text))',
            'hoverColor':   'var(--iridis-text)',
            'checkedColor': 'var(--iridis-background)',
          },
        },
      },
    },
  },
});
