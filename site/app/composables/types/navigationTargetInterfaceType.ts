/** Addressable page navigation target with behavior resolved at creation. */
export abstract class NavigationTargetInterfaceType {
  public readonly id: string;
  public readonly label: string;
  public readonly panelId: string | undefined;
  public readonly stage: string | undefined;

  protected constructor(id: string, label: string, options: { readonly 'panelId': string | undefined; readonly 'stage': string | undefined }) {
    this.id = id;
    this.label = label;
    this.panelId = options.panelId;
    this.stage = options.stage;
  }

  public static card(id: string, label: string, stage: string): NavigationTargetInterfaceType {
    const result = new CardNavigationTarget(id, label, stage);
    return result;
  }

  public static document(id: string, label: string, panelId: string): NavigationTargetInterfaceType {
    const result = new DocumentNavigationTarget(id, label, panelId);
    return result;
  }

  public static stage(id: string, label: string): NavigationTargetInterfaceType {
    const result = new StageNavigationTarget(id, label);
    return result;
  }

  public abstract isCard(): boolean;
  public abstract isDocument(): boolean;
}

class CardNavigationTarget extends NavigationTargetInterfaceType {
  public constructor(id: string, label: string, stage: string) {
    super(id, label, { 'panelId': undefined, 'stage': stage });
  }

  public isCard(): boolean {
    return true;
  }

  public isDocument(): boolean {
    return false;
  }
}

class DocumentNavigationTarget extends NavigationTargetInterfaceType {
  public constructor(id: string, label: string, panelId: string) {
    super(id, label, { 'panelId': panelId, 'stage': undefined });
  }

  public isCard(): boolean {
    return false;
  }

  public isDocument(): boolean {
    return true;
  }
}

class StageNavigationTarget extends NavigationTargetInterfaceType {
  public constructor(id: string, label: string) {
    super(id, label, { 'panelId': undefined, 'stage': undefined });
  }

  public isCard(): boolean {
    return false;
  }

  public isDocument(): boolean {
    return false;
  }
}
