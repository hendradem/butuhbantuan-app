import { n as parse } from "../@babel/parser.mjs";
import { C as BindingMetadata, E as CompilerOptions, F as walkIdentifiers, M as generateCodeFrame, N as isInDestructureAssignment, P as isStaticProperty, T as CompilerError, j as extractIdentifiers } from "../@unhead/vue.mjs";
import { A as invalidateTypeCache, C as compileStyle, D as extractRuntimeEmits, E as errorMessages, F as rewriteDefault, I as rewriteDefaultAST, L as shouldTransformRef, M as parseCache, N as registerTS, O as extractRuntimeProps, P as resolveTypeElements, R as version, S as compileScript, T as compileTemplate, V as MagicString, _ as ScriptCompileContext, a as SFCBlock, b as TemplateCompiler, c as SFCParseResult, d as SFCStyleBlock, f as SFCStyleCompileOptions, g as SFCTemplateCompileResults, h as SFCTemplateCompileOptions, i as SFCAsyncStyleCompileOptions, j as parse$1, k as inferRuntimeType, l as SFCScriptBlock, m as SFCTemplateBlock, n as AssetURLOptions, o as SFCDescriptor, p as SFCStyleCompileResults, r as AssetURLTagConfig, s as SFCParseOptions, u as SFCScriptCompileOptions, v as SimpleTypeResolveContext, w as compileStyleAsync, x as TypeResolveContext, y as SimpleTypeResolveOptions, z as walk } from "./plugin-vue-jsx.mjs";

//#region ../../node_modules/.pnpm/vue@3.5.27_typescript@5.9.3/node_modules/vue/compiler-sfc/index.d.mts
declare namespace index_d_exports {
  export { AssetURLOptions, AssetURLTagConfig, BindingMetadata, CompilerError, CompilerOptions, MagicString, SFCAsyncStyleCompileOptions, SFCBlock, SFCDescriptor, SFCParseOptions, SFCParseResult, SFCScriptBlock, SFCScriptCompileOptions, SFCStyleBlock, SFCStyleCompileOptions, SFCStyleCompileResults, SFCTemplateBlock, SFCTemplateCompileOptions, SFCTemplateCompileResults, ScriptCompileContext, SimpleTypeResolveContext, SimpleTypeResolveOptions, TemplateCompiler, TypeResolveContext, parse as babelParse, compileScript, compileStyle, compileStyleAsync, compileTemplate, errorMessages, extractIdentifiers, extractRuntimeEmits, extractRuntimeProps, generateCodeFrame, inferRuntimeType, invalidateTypeCache, isInDestructureAssignment, isStaticProperty, parse$1 as parse, parseCache, registerTS, resolveTypeElements, rewriteDefault, rewriteDefaultAST, shouldTransformRef, version, walk, walkIdentifiers };
}
//#endregion
//#region ../../node_modules/.pnpm/@vitejs+plugin-vue@6.0.4_vite@7.3.1_@types+node@24.10.11_jiti@2.6.1_terser@5.44.1_yaml@_ac9e2a922bb63677ceeba3834af69115/node_modules/@vitejs/plugin-vue/dist/index.d.mts
//#endregion
//#region src/index.d.ts
interface Options {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  /**
   * In Vite, this option follows Vite's config.
   */
  isProduction?: boolean;
  script?: Partial<Omit<SFCScriptCompileOptions, 'id' | 'isProd' | 'inlineTemplate' | 'templateOptions' | 'sourceMap' | 'genDefaultAs' | 'customElement' | 'defineModel' | 'propsDestructure'>> & {
    /**
     * @deprecated defineModel is now a stable feature and always enabled if
     * using Vue 3.4 or above.
     */
    defineModel?: boolean;
    /**
     * @deprecated moved to `features.propsDestructure`.
     */
    propsDestructure?: boolean;
  };
  template?: Partial<Omit<SFCTemplateCompileOptions, 'id' | 'source' | 'ast' | 'filename' | 'scoped' | 'slotted' | 'isProd' | 'inMap' | 'ssr' | 'ssrCssVars' | 'preprocessLang'>>;
  style?: Partial<Omit<SFCStyleCompileOptions, 'filename' | 'id' | 'isProd' | 'source' | 'scoped' | 'cssDevSourcemap' | 'postcssOptions' | 'map' | 'postcssPlugins' | 'preprocessCustomRequire' | 'preprocessLang' | 'preprocessOptions'>>;
  /**
   * Use custom compiler-sfc instance. Can be used to force a specific version.
   */
  compiler?: typeof index_d_exports;
  /**
   * Requires @vitejs/plugin-vue@^5.1.0
   */
  features?: {
    /**
     * Enable reactive destructure for `defineProps`.
     * - Available in Vue 3.4 and later.
     * - **default:** `false` in Vue 3.4 (**experimental**), `true` in Vue 3.5+
     */
    propsDestructure?: boolean;
    /**
     * Transform Vue SFCs into custom elements.
     * - `true`: all `*.vue` imports are converted into custom elements
     * - `string | RegExp`: matched files are converted into custom elements
     * - **default:** /\.ce\.vue$/
     */
    customElement?: boolean | string | RegExp | (string | RegExp)[];
    /**
     * Set to `false` to disable Options API support and allow related code in
     * Vue core to be dropped via dead-code elimination in production builds,
     * resulting in smaller bundles.
     * - **default:** `true`
     */
    optionsAPI?: boolean;
    /**
     * Set to `true` to enable devtools support in production builds.
     * Results in slightly larger bundles.
     * - **default:** `false`
     */
    prodDevtools?: boolean;
    /**
     * Set to `true` to enable detailed information for hydration mismatch
     * errors in production builds. Results in slightly larger bundles.
     * - **default:** `false`
     */
    prodHydrationMismatchDetails?: boolean;
    /**
     * Customize the component ID generation strategy.
     * - `'filepath'`: hash the file path (relative to the project root)
     * - `'filepath-source'`: hash the file path and the source code
     * - `function`: custom function that takes the file path, source code,
     *   whether in production mode, and the default hash function as arguments
     * - **default:** `'filepath'` in development, `'filepath-source'` in production
     */
    componentIdGenerator?: 'filepath' | 'filepath-source' | ((filepath: string, source: string, isProduction: boolean | undefined, getHash: (text: string) => string) => string);
  };
  /**
   * @deprecated moved to `features.customElement`.
   */
  customElement?: boolean | string | RegExp | (string | RegExp)[];
}
//#endregion
export { Options as t };