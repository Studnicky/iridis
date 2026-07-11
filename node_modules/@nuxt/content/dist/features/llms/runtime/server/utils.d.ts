import type { LLMsSection } from 'nuxt-llms';
import type { PageCollectionItemBase, SQLOperator } from '@nuxt/content';
export interface ContentLLMSCollectionSection extends LLMsSection {
    __nuxt_content_auto_generate?: boolean;
    contentCollection?: string;
    contentFilters?: Array<{
        field: string;
        operator: SQLOperator;
        value?: string;
    }>;
}
export declare function createDocumentGenerator(): Promise<(doc: PageCollectionItemBase, options: {
    domain: string;
}) => Promise<string | null>>;
export declare function prepareContentSections(sections: LLMsSection[]): void;
