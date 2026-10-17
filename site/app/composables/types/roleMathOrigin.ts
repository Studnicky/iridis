abstract class RoleMathOriginBehavior {
  public abstract isDerived(): boolean;
  public abstract isPinned(): boolean;
  public abstract isSynthesized(): boolean;
}

class DirectRoleMathOrigin extends RoleMathOriginBehavior {
  public isDerived(): boolean {return false;}
  public isPinned(): boolean {return false;}
  public isSynthesized(): boolean {return false;}
}

class DerivedRoleMathOrigin extends RoleMathOriginBehavior {
  public isDerived(): boolean {return true;}
  public isPinned(): boolean {return false;}
  public isSynthesized(): boolean {return false;}
}

class PinnedRoleMathOrigin extends RoleMathOriginBehavior {
  public isDerived(): boolean {return false;}
  public isPinned(): boolean {return true;}
  public isSynthesized(): boolean {return false;}
}

class SynthesizedRoleMathOrigin extends RoleMathOriginBehavior {
  public isDerived(): boolean {return false;}
  public isPinned(): boolean {return false;}
  public isSynthesized(): boolean {return true;}
}

export class RoleMathOrigin {
  public static readonly Direct: RoleMathOriginBehavior = new DirectRoleMathOrigin();
  public static readonly Derived: RoleMathOriginBehavior = new DerivedRoleMathOrigin();
  public static readonly Pinned: RoleMathOriginBehavior = new PinnedRoleMathOrigin();
  public static readonly Synthesized: RoleMathOriginBehavior = new SynthesizedRoleMathOrigin();

  public static resolve(
    roleName: string,
    pinnedRoleNames: ReadonlySet<string>,
    synthesizedRoleNames: ReadonlySet<string>,
    derivedRoleNames: ReadonlySet<string>
  ): RoleMathOriginBehavior {
    if (pinnedRoleNames.has(roleName)) {return RoleMathOrigin.Pinned;}
    if (synthesizedRoleNames.has(roleName)) {return RoleMathOrigin.Synthesized;}
    if (derivedRoleNames.has(roleName)) {return RoleMathOrigin.Derived;}
    return RoleMathOrigin.Direct;
  }
}
