import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';

export function buildUploadedImageFieldPatch<Key extends keyof UploadedImageInterfaceType>(
  image: UploadedImageInterfaceType,
  key: Key,
  value: UploadedImageInterfaceType[Key]
): UploadedImageInterfaceType {
  return {
    ...image,
    [key]: value
  };
}
