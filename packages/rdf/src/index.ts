import './types/augmentation.ts';
import { RdfPlugin } from './RdfPlugin.ts';

export { iridisVocab }        from './data/iridisVocab.ts';
export { RdfPlugin };
export { reasonAnnotate }     from './tasks/ReasonAnnotate.ts';
export { reasonSerialize }    from './tasks/ReasonSerialize.ts';

export const rdfPlugin = new RdfPlugin();
