/** XSD datatype and rdf:type IRIs used to build typed literals in the reasoning graph. */
export const XSD_IRI = {
  'BOOLEAN':  'http://www.w3.org/2001/XMLSchema#boolean',
  'DECIMAL':  'http://www.w3.org/2001/XMLSchema#decimal',
  'RDF_TYPE': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'STRING':   'http://www.w3.org/2001/XMLSchema#string'
} as const;
