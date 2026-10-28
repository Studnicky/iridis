import { RDF_RUN_IDENTIFIER_PATTERN } from './RDF_RUN_IDENTIFIER_PATTERN.ts';

/** The RDF serialization embeds a wall-clock run identifier; masking it makes output text comparable across runs. */
export class RdfRunIdentifier {
  public static mask(text: string): string {
    const result = text.replaceAll(RDF_RUN_IDENTIFIER_PATTERN, 'run-0');
    return result;
  }
}
