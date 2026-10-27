import type { PaletteSnapshotEntity } from '../../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionInputEntity } from '../entities/PaletteSessionInputEntity.ts';
import type { PaletteSessionEffectHandlersInterface } from '../interfaces/PaletteSessionEffectHandlersInterface.ts';

/** An action the palette FSM requests; each concrete effect runs itself against the handler port. */
export abstract class PaletteSessionEffect {
  abstract readonly variant: string;

  static fail(revision: number, correlationId: string, message: string): PaletteSessionEffect {
    const result = new FailEffect(revision, correlationId, message);
    return result;
  }

  static publish(
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ): PaletteSessionEffect {
    const result = new PublishEffect(revision, correlationId, input, snapshot);
    return result;
  }

  static settle(): PaletteSessionEffect {
    const result = new SettleEffect();
    return result;
  }

  static submit(revision: number, correlationId: string, input: PaletteSessionInputEntity.Type): PaletteSessionEffect {
    const result = new SubmitEffect(revision, correlationId, input);
    return result;
  }

  abstract execute(handlers: PaletteSessionEffectHandlersInterface): void;
}

class FailEffect extends PaletteSessionEffect {
  readonly variant: string = 'fail';

  constructor(
    private readonly revision: number,
    private readonly correlationId: string,
    private readonly message: string
  ) { super(); }

  execute(handlers: PaletteSessionEffectHandlersInterface): void {
    handlers.fail(this.revision, this.correlationId, this.message);
  }
}

class PublishEffect extends PaletteSessionEffect {
  readonly variant: string = 'publish';

  constructor(
    private readonly revision: number,
    private readonly correlationId: string,
    private readonly input: PaletteSessionInputEntity.Type,
    private readonly snapshot: PaletteSnapshotEntity.Type
  ) { super(); }

  execute(handlers: PaletteSessionEffectHandlersInterface): void {
    handlers.publish(this.revision, this.correlationId, this.input, this.snapshot);
  }
}

class SettleEffect extends PaletteSessionEffect {
  readonly variant: string = 'settle';

  execute(handlers: PaletteSessionEffectHandlersInterface): void {
    handlers.settle();
  }
}

class SubmitEffect extends PaletteSessionEffect {
  readonly variant: string = 'submit';

  constructor(
    private readonly revision: number,
    private readonly correlationId: string,
    private readonly input: PaletteSessionInputEntity.Type
  ) { super(); }

  execute(handlers: PaletteSessionEffectHandlersInterface): void {
    handlers.submit(this.revision, this.correlationId, this.input);
  }
}
