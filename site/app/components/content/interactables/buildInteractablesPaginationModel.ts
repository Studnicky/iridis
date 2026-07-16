export type InteractablesPaginationModel<Role> = {
  readonly pageRoles: readonly Role[];
};

export function buildInteractablesPaginationModel<Role>(
  roles: readonly Role[],
  page: number,
  pageSize: number
): InteractablesPaginationModel<Role> {
  return {
    pageRoles: roles.slice((page - 1) * pageSize, page * pageSize)
  };
}
