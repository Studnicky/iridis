import { JSType, Schema, InputValue } from 'untyped';

type ConfigInputsTypes = Exclude<JSType, 'symbol' | 'function' | 'any' | 'bigint'> | 'default' | 'icon' | 'file' | 'media' | 'component' | 'textarea';
type PickerTypes = 'media-picker' | 'icon-picker';
type PartialSchema = Pick<Schema, 'title' | 'description' | 'default' | 'required'> & {
    [key: string]: unknown;
};
declare const supportedFields: {
    [key in ConfigInputsTypes]: Schema;
};
type PreviewFieldData = PartialSchema & {
    type?: keyof typeof supportedFields;
    icon?: string;
    fields?: {
        [key: string]: InputValue;
    };
};
/**
 * Helper to build preview compatible configuration schema.
 */
declare function field(schema: PreviewFieldData): InputValue;
declare function group(schema: PreviewFieldData): InputValue;

export { field, group };
export type { ConfigInputsTypes, PartialSchema, PickerTypes, PreviewFieldData };
