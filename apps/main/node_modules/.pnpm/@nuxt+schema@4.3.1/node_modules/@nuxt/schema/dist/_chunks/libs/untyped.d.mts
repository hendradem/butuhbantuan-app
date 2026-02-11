//#region ../../node_modules/.pnpm/untyped@2.0.0/node_modules/untyped/dist/shared/untyped.kR35CG5k.d.mts
type JSValue = string | number | bigint | boolean | symbol | Function | Array<any> | undefined | object | null;
type JSType = "string" | "number" | "bigint" | "boolean" | "symbol" | "function" | "object" | "any" | "array";
type ResolveFn = (value: unknown, get: (key: string) => Promise<unknown>) => JSValue | Promise<JSValue>;
interface TypeDescriptor {
  /** Used internally to handle schema types */
  type?: JSType | JSType[];
  /** Fully resolved correct TypeScript type for generated TS declarations */
  tsType?: string;
  /** Human-readable type description for use in generated documentation */
  markdownType?: string;
  items?: TypeDescriptor | TypeDescriptor[];
}
interface FunctionArg extends TypeDescriptor {
  name?: string;
  default?: JSValue;
  optional?: boolean;
}
interface Schema extends TypeDescriptor {
  id?: string;
  default?: JSValue;
  resolve?: ResolveFn;
  properties?: {
    [key: string]: Schema;
  };
  required?: string[];
  title?: string;
  description?: string;
  $schema?: string;
  tags?: string[];
  args?: FunctionArg[];
  returns?: TypeDescriptor;
}
interface InputObject {
  $schema?: Schema;
  $resolve?: ResolveFn;
  $default?: any;
  [key: string]: JSValue | InputObject;
}
type SchemaDefinition = {
  [x: string]: JSValue | InputObject;
};
//#endregion
export { Schema as n, SchemaDefinition as r, InputObject as t };