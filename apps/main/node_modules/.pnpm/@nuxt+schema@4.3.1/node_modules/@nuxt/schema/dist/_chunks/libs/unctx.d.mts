//#region ../../node_modules/.pnpm/unctx@2.5.0/node_modules/unctx/dist/transform.d.ts
interface TransformerOptions {
  /**
   * The function names to be transformed.
   *
   * @default ['withAsyncContext']
   */
  asyncFunctions?: string[];
  /**
   * @default 'unctx'
   */
  helperModule?: string;
  /**
   * @default 'executeAsync'
   */
  helperName?: string;
  /**
   * Whether to transform properties of an object defined with a helper function. For example,
   * to transform key `middleware` within the object defined with function `defineMeta`, you would pass:
   * `{ defineMeta: ['middleware'] }`.
   * @default {}
   */
  objectDefinitions?: Record<string, string[]>;
}
//#endregion
export { TransformerOptions as t };