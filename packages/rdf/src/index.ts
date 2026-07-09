import './types/augmentation.ts';
import { RdfPlugin } from './RdfPlugin.ts';

export { colorologyVocab }    from './data/colorologyVocab.ts';
export { RdfPlugin };
export { reasonAnnotate }     from './tasks/ReasonAnnotate.ts';
export { reasonSerialize }    from './tasks/ReasonSerialize.ts';

export const rdfPlugin = new RdfPlugin();
