class InteractablesPaginationModel<Role> {
  public readonly pageRoles: Role[];

  public constructor(pageRoles: Role[]) {
    this.pageRoles = pageRoles;
  }
}

export const buildInteractablesPaginationModel = class InteractablesPaginationModelBuilder {
  public static build<Role>(
    roles: readonly Role[],
    page: number,
    pageSize: number
  ): InteractablesPaginationModel<Role> {
    return new InteractablesPaginationModel(roles.slice((page - 1) * pageSize, page * pageSize));
  }
};
