import type { RoleViewType } from '../types/roleViewType.ts';
import type { FrameRecorderInterface } from './FrameRecorderInterface.ts';
import type { LivingBackgroundEnvironmentInterface } from './LivingBackgroundEnvironmentInterface.ts';
import type { LivingBackgroundFrameInterface } from './LivingBackgroundFrameInterface.ts';

export interface LivingBackgroundDriverOptionsInterface {
  readonly 'environment': LivingBackgroundEnvironmentInterface;
  readonly 'onFrame': (frame: LivingBackgroundFrameInterface) => void;
  readonly 'random'?: () => number;
  readonly 'readViews': () => RoleViewType[];
  readonly 'recorder'?: FrameRecorderInterface;
}
