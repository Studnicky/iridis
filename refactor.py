import os
import re

event_enum = """export enum IridisUiActionType {
  SELECT_MODE = 'SELECT_MODE',
  SELECT_CARD = 'SELECT_CARD',
  NAVIGATE = 'NAVIGATE',
  DRAG_START = 'DRAG_START',
  DRAG_MOVE = 'DRAG_MOVE',
  DRAG_END = 'DRAG_END',
  POPOVER_OPEN = 'POPOVER_OPEN',
  POPOVER_CLOSE = 'POPOVER_CLOSE',
  ADD_SEED = 'ADD_SEED',
  REMOVE_SEED = 'REMOVE_SEED',
  SET_SEED = 'SET_SEED',
  PIN_SEED_ROLE = 'PIN_SEED_ROLE',
  SET_FRAMING = 'SET_FRAMING',
  SET_SCHEMA = 'SET_SCHEMA',
  SET_CONTRAST_STRICTNESS = 'SET_CONTRAST_STRICTNESS',
  SET_COLOR_SPACE = 'SET_COLOR_SPACE',
  SET_CVD_CORRECT = 'SET_CVD_CORRECT',
  SET_IMAGE_ALGORITHM = 'SET_IMAGE_ALGORITHM',
  SET_IMAGE_K = 'SET_IMAGE_K',
  SET_IMAGE_HISTOGRAM_BITS = 'SET_IMAGE_HISTOGRAM_BITS',
  SET_IMAGE_DELTA_E_CAP = 'SET_IMAGE_DELTA_E_CAP',
  SET_IMAGE_HARMONIZE = 'SET_IMAGE_HARMONIZE',
  SET_IMAGE_LIGHTNESS_RANGE = 'SET_IMAGE_LIGHTNESS_RANGE',
  SET_IMAGE_CHROMA_RANGE = 'SET_IMAGE_CHROMA_RANGE',
  EXTRACT_IMAGE = 'EXTRACT_IMAGE'
}
"""

effect_enum = """export enum IridisUiEffectVariant {
  MUTATE_SEEDS = 'MUTATE_SEEDS',
  PIN_SEED_ROLE = 'PIN_SEED_ROLE',
  SET_PALETTE_PARAM = 'SET_PALETTE_PARAM',
  EXTRACT_IMAGE = 'EXTRACT_IMAGE'
}
"""

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # If it's the event types file
    if filepath.endswith('iridisUiEvent.ts'):
        content = event_enum + "\n" + content
        content = re.sub(r"'type': '([A-Z_]+)'", r"'type': IridisUiActionType.\1", content)
    
    # If it's the effect types file
    elif filepath.endswith('iridisUiEffect.ts'):
        content = effect_enum + "\n" + content
        content = re.sub(r"'variant': '([A-Z_]+)'", r"'variant': IridisUiEffectVariant.\1", content)
        content = re.sub(r"variant: '([A-Z_]+)'", r"variant: IridisUiEffectVariant.\1", content)

    # For other TS/Vue files
    else:
        # Add imports if they use send({ type: ... }) or return { variant: ... }
        needs_action = bool(re.search(r"['\"]?type['\"]?\s*:\s*['\"]([A-Z_]+)['\"]", content))
        needs_effect = bool(re.search(r"['\"]?variant['\"]?\s*:\s*['\"]([A-Z_]+)['\"]", content))

        if filepath.endswith('.vue') and (needs_action or needs_effect):
            imports = []
            if needs_action: imports.append('IridisUiActionType')
            if needs_effect: imports.append('IridisUiEffectVariant')
            import_stmt = f"import {{ {', '.join(imports)} }} from '~/composables/types/index.ts';\n"
            content = re.sub(r'(<script setup.*?>\n)', r'\1' + import_stmt, content)

        if filepath.endswith('.ts') and (needs_action or needs_effect):
            imports = []
            if needs_action: imports.append('IridisUiActionType')
            if needs_effect: imports.append('IridisUiEffectVariant')
            # Look for existing imports from types
            if 'import type { IridisUiEffectType' in content or 'import type { IridisUiEventType' in content:
                # We'll just add it to the top
                import_stmt = f"import {{ {', '.join(imports)} }} from '../types/index.ts';\n"
                if 'useIridis.ts' in filepath:
                    import_stmt = f"import {{ {', '.join(imports)} }} from './types/index.ts';\n"
                content = import_stmt + content

        # Replace 'type': 'ACTION' -> 'type': IridisUiActionType.ACTION
        content = re.sub(r"(['\"]?)type\1\s*:\s*['\"]([A-Z_]+)['\"]", r"\1type\1: IridisUiActionType.\2", content)
        # Replace 'variant': 'EFFECT' -> 'variant': IridisUiEffectVariant.EFFECT
        content = re.sub(r"(['\"]?)variant\1\s*:\s*['\"]([A-Z_]+)['\"]", r"\1variant\1: IridisUiEffectVariant.\2", content)

        # In IridisUiMachine.ts, fix case 'ACTION': -> case IridisUiActionType.ACTION:
        if 'IridisUiMachine.ts' in filepath:
            content = re.sub(r"case ['\"]([A-Z_]+)['\"]:", r"case IridisUiActionType.\1:", content)

    if original != content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

files_to_check = [
    'site/app/composables/types/iridisUiEvent.ts',
    'site/app/composables/types/iridisUiEffect.ts',
    'site/app/composables/types/index.ts',
    'site/app/composables/fsm/IridisUiMachine.ts',
    'site/app/composables/useIridis.ts',
    'site/app/composables/useIridisUiMachine.ts',
    'site/app/components/layout/CylinderCarousel.vue',
    'site/app/components/layout/TableOfContentsBar.vue',
    'site/app/components/content/PaletteControls.vue',
    'site/app/components/content/PipelineExplainer.vue'
]

for filepath in files_to_check:
    process_file(filepath)

