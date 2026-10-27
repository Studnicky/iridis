/** Presents an authored relationship operation for role-math views. */
export class RoleRelationshipOperationPresentation {
  public static readonly Alias = new RoleRelationshipOperationPresentation('alias');
  public static readonly AlphaOverlay = new RoleRelationshipOperationPresentation('alpha-overlay');
  public static readonly HueOffset = new RoleRelationshipOperationPresentation('hue-offset');
  public static readonly HueTarget = new RoleRelationshipOperationPresentation('hue-target');
  public static readonly OklchDelta = new RoleRelationshipOperationPresentation('oklch-delta');
  public static readonly OklchInterpolate = new RoleRelationshipOperationPresentation('oklch-interpolate');

  public readonly label: string;

  private constructor(label: string) {
    this.label = label;
  }
}
