export interface ValidationErrorInterface {
  readonly 'path':    string;
  readonly 'message': string;
}

export interface ValidationResultInterface {
  readonly 'valid':  boolean;
  readonly 'errors': ValidationErrorInterface[];
}
