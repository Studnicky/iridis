export abstract class RoleMathCandidatePresentation {
  public static selected(): RoleMathCandidatePresentation {
    const result = new SelectedRoleMathCandidatePresentation();
    return result;
  }

  public static unselected(): RoleMathCandidatePresentation {
    const result = new UnselectedRoleMathCandidatePresentation();
    return result;
  }

  public abstract isSelected(): boolean;
}

class SelectedRoleMathCandidatePresentation extends RoleMathCandidatePresentation {
  public isSelected(): boolean {
    return true;
  }
}

class UnselectedRoleMathCandidatePresentation extends RoleMathCandidatePresentation {
  public isSelected(): boolean {
    return false;
  }
}
