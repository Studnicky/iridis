import type { CollectionQueryBuilder, DatabaseAdapter, PageCollectionItemBase } from '~/src/types';
export type Section = {
    /** Path to the section, including anchor for sub-headings (e.g. `/guide#installation`) */
    id: string;
    title: string;
    /** Titles of all ancestor headings, from the page title down to the parent of this section */
    titles: string[];
    level: number;
    content: string;
};
export type SearchResult = {
    collection: string;
    id: string;
    title: string;
    titles: string[];
    level: number;
    content: string;
    rank: number;
    snippets?: {
        title?: string;
        content?: string;
    };
};
export type SearchCollectionOptions = {
    /**
     * Maximum number of results to return.
     * @default 20
     */
    limit?: number;
    /** Restrict search to specific columns. Searches all columns when omitted. */
    fields?: ('title' | 'content')[];
    /**
     * Ignore search terms shorter than this value.
     * @default 1
     */
    minTermLength?: number;
    /** Control how matches in different columns and heading levels affect ranking. */
    weights?: {
        /**
         * Boost factor for matches in the title column.
         * @default 20
         */
        title?: number;
        /**
         * Boost factor for matches in the content column.
         * @default 5
         */
        content?: number;
        /**
         * Exponent controlling heading-level boost.
         * Higher-level sections (h1 > h2 > h3...) are boosted by dividing the
         * BM25 score by `pow(level, heading)`.
         * - `0.5` (default): sqrt curve — gentler falloff
         * - `1`: linear penalty (h4 gets 1/4 the score of h1)
         * - `0`: no level-based penalty
         * @default 0.5
         */
        heading?: number;
    };
    /** Return text snippets with highlighted matches for the specified columns. */
    snippet?: {
        /**
         * Which columns to extract snippets from.
         * @default ['content']
         */
        columns?: ('title' | 'content')[];
        /**
         * Number of tokens around the match to include.
         * @default 30
         */
        around?: number;
        /**
         * HTML tag used to wrap matched terms.
         * @default 'mark'
         */
        tag?: string;
    };
};
export type GenerateSearchSectionsOptions = {
    ignoredTags?: string[];
    extraFields?: (string | symbol | number)[];
    minHeading?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
    maxHeading?: `h${1 | 2 | 3 | 4 | 5 | 6}`;
};
export declare function generateSearchSections<T extends PageCollectionItemBase, const K extends keyof T>(queryBuilder: CollectionQueryBuilder<T>, opts: Omit<GenerateSearchSectionsOptions, 'extraFields'> & {
    extraFields: K[];
}): Promise<Array<Section & Pick<T, K>>>;
export declare function generateSearchSections<T extends PageCollectionItemBase>(queryBuilder: CollectionQueryBuilder<T>, opts?: GenerateSearchSectionsOptions): Promise<Section[]>;
export declare function _resetFTSState(): void;
export declare function resetFTSIndex(db: DatabaseAdapter): Promise<void>;
export declare function buildFTSIndex<T extends PageCollectionItemBase>(db: DatabaseAdapter, collection: string, queryBuilder: CollectionQueryBuilder<T>, opts?: GenerateSearchSectionsOptions): Promise<void>;
export declare function queryFTS(db: DatabaseAdapter, collections: string[], query: string, opts?: SearchCollectionOptions): Promise<SearchResult[]>;
