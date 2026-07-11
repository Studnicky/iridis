import type { DraftFile, DraftSyncFile } from '~/src/types/preview';
export declare const PreviewConfigFiles: {
    appConfig: string;
    appConfigV4: string;
    nuxtConfig: string;
};
export declare function withoutRoot(path: string): string;
export declare function withoutPrefixNumber(path: string, leadingSlash?: boolean): string;
export declare function generateStemFromPath(path: string): string;
export declare function mergeDraft(dbFiles: DraftSyncFile[] | undefined, draftAdditions: DraftFile[], draftDeletions: DraftFile[]): DraftSyncFile[];
