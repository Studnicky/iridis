import type { Draft07 } from '@nuxt/content';
export declare function getOrderedSchemaKeys(schema: Draft07): string[];
export declare function describeProperty(schema: Draft07, property: string): {
    name: string;
    sqlType: string;
    type?: string;
    default?: unknown;
    nullable: boolean;
    maxLength?: number;
    enum?: string[];
    json?: boolean;
};
export declare function getCollectionFieldsTypes(schema: Draft07): Record<string, "string" | "number" | "boolean" | "json" | "date">;
