import { Stats } from "node:fs";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

//#region ../../node_modules/.pnpm/chokidar@5.0.0/node_modules/chokidar/index.d.ts
type AWF = {
  stabilityThreshold: number;
  pollInterval: number;
};
type BasicOpts = {
  persistent: boolean;
  ignoreInitial: boolean;
  followSymlinks: boolean;
  cwd?: string;
  usePolling: boolean;
  interval: number;
  binaryInterval: number;
  alwaysStat?: boolean;
  depth?: number;
  ignorePermissionErrors: boolean;
  atomic: boolean | number;
};
type ChokidarOptions = Partial<BasicOpts & {
  ignored: Matcher | Matcher[];
  awaitWriteFinish: boolean | Partial<AWF>;
}>;
type MatchFunction = (val: string, stats?: Stats) => boolean;
interface MatcherObject {
  path: string;
  recursive?: boolean;
}
type Matcher = string | RegExp | MatchFunction | MatcherObject;
//#endregion
//#region ../../node_modules/.pnpm/giget@2.0.0/node_modules/giget/dist/index.d.mts
interface TemplateInfo {
  name: string;
  tar: string;
  version?: string;
  subdir?: string;
  url?: string;
  defaultDir?: string;
  headers?: Record<string, string | undefined>;
  source?: never;
  dir?: never;
  [key: string]: any;
}
type TemplateProvider = (input: string, options: {
  auth?: string;
}) => TemplateInfo | Promise<TemplateInfo> | null;
interface DownloadTemplateOptions {
  provider?: string;
  force?: boolean;
  forceClean?: boolean;
  offline?: boolean;
  preferOffline?: boolean;
  providers?: Record<string, TemplateProvider>;
  dir?: string;
  registry?: false | string;
  cwd?: string;
  auth?: string;
  install?: boolean;
  silent?: boolean;
}
//#endregion
//#region ../../node_modules/.pnpm/c12@3.3.3_magicast@0.5.1/node_modules/c12/dist/index.d.mts
//#region src/dotenv.d.ts
interface DotenvOptions {
  /**
   * The project root directory (either absolute or relative to the current working directory).
   *
   * Defaults to `options.cwd` in `loadConfig` context, or `process.cwd()` when used as standalone.
   */
  cwd?: string;
  /**
   * What file or files to look in for environment variables (either absolute or relative
   * to the current working directory). For example, `.env`.
   * With the array type, the order enforce the env loading priority (last one overrides).
   */
  fileName?: string | string[];
  /**
   * Whether to interpolate variables within .env.
   *
   * @example
   * ```env
   * BASE_DIR="/test"
   * # resolves to "/test/further"
   * ANOTHER_DIR="${BASE_DIR}/further"
   * ```
   */
  interpolate?: boolean;
  /**
   * An object describing environment variables (key, value pairs).
   */
  env?: NodeJS.ProcessEnv;
}
declare global {
  var __c12_dotenv_vars__: Map<Record<string, any>, Set<string>>;
} //#endregion
//#region src/types.d.ts
interface ConfigLayerMeta {
  name?: string;
  [key: string]: any;
}
type UserInputConfig = Record<string, any>;
interface SourceOptions<T extends UserInputConfig = UserInputConfig, MT extends ConfigLayerMeta = ConfigLayerMeta> {
  /** Custom meta for layer */
  meta?: MT;
  /** Layer config overrides */
  overrides?: T;
  [key: string]: any;
  /**
   * Options for cloning remote sources
   *
   * @see https://giget.unjs.io
   */
  giget?: DownloadTemplateOptions;
  /**
   * Install dependencies after cloning
   *
   * @see https://nypm.unjs.io
   */
  install?: boolean;
  /**
   * Token for cloning private sources
   *
   * @see https://giget.unjs.io#providing-token-for-private-repositories
   */
  auth?: string;
}
interface ConfigLayer<T extends UserInputConfig = UserInputConfig, MT extends ConfigLayerMeta = ConfigLayerMeta> {
  config: T | null;
  source?: string;
  sourceOptions?: SourceOptions<T, MT>;
  meta?: MT;
  cwd?: string;
  configFile?: string;
}
interface ResolvedConfig<T extends UserInputConfig = UserInputConfig, MT extends ConfigLayerMeta = ConfigLayerMeta> extends ConfigLayer<T, MT> {
  config: T;
  layers?: ConfigLayer<T, MT>[];
  cwd?: string;
  _configFile?: string;
}
//#endregion
export { ChokidarOptions as i, ResolvedConfig as n, SourceOptions as r, DotenvOptions as t };