import { E as CompilerOptions, S as compiler_dom_d_exports, T as CompilerError, k as RootNode, w as CodegenResult } from "../@unhead/vue.mjs";
import { B as typescript_d_exports, c as SFCParseResult } from "../@vitejs/plugin-vue-jsx.mjs";
import { t as Mapping } from "../@volar/source-map.mjs";
import { t as CodeInformation } from "../@volar/language-core.mjs";
import "@vue/shared";

//#region ../../node_modules/.pnpm/muggle-string@0.4.1/node_modules/muggle-string/out/types.d.ts
declare const NO_DATA_SYMBOL: unique symbol;
type Segment<T = typeof NO_DATA_SYMBOL> = string | (T extends typeof NO_DATA_SYMBOL ? [text: string, source: string | undefined, sourceOffset: number] : [text: string, source: string | undefined, sourceOffset: number, data: T]);
//#endregion
//#region ../../node_modules/.pnpm/@vue+language-core@3.2.4/node_modules/@vue/language-core/lib/virtualCode/embeddedCodes.d.ts
declare class VueEmbeddedCode {
  id: string;
  lang: string;
  content: Code[];
  parentCodeId?: string;
  linkedCodeMappings: Mapping[];
  embeddedCodes: VueEmbeddedCode[];
  constructor(id: string, lang: string, content: Code[]);
}
//#endregion
//#region ../../node_modules/.pnpm/@vue+language-core@3.2.4/node_modules/@vue/language-core/lib/types.d.ts
type RawVueCompilerOptions = Partial<Omit<VueCompilerOptions, 'target' | 'plugins'>> & {
  strictTemplates?: boolean;
  target?: 'auto' | 3 | 3.3 | 3.5 | 3.6 | 99 | number;
  plugins?: RawPlugin[];
};
type RawPlugin = string | (Record<string, any> & {
  name: string;
});
interface VueCodeInformation extends CodeInformation {
  __importCompletion?: boolean;
  __shorthandExpression?: 'html' | 'js';
  __combineToken?: symbol;
  __linkedToken?: symbol;
}
type Code = Segment<VueCodeInformation>;
interface VueCompilerOptions {
  target: number;
  lib: string;
  typesRoot: string;
  extensions: string[];
  vitePressExtensions: string[];
  petiteVueExtensions: string[];
  jsxSlots: boolean;
  strictVModel: boolean;
  strictCssModules: boolean;
  checkUnknownProps: boolean;
  checkUnknownEvents: boolean;
  checkUnknownDirectives: boolean;
  checkUnknownComponents: boolean;
  inferComponentDollarEl: boolean;
  inferComponentDollarRefs: boolean;
  inferTemplateDollarAttrs: boolean;
  inferTemplateDollarEl: boolean;
  inferTemplateDollarRefs: boolean;
  inferTemplateDollarSlots: boolean;
  skipTemplateCodegen: boolean;
  fallthroughAttributes: boolean;
  resolveStyleImports: boolean;
  resolveStyleClassNames: boolean | 'scoped';
  fallthroughComponentNames: string[];
  dataAttributes: string[];
  htmlAttributes: string[];
  optionsWrapper: [string, string] | [];
  macros: {
    defineProps: string[];
    defineSlots: string[];
    defineEmits: string[];
    defineExpose: string[];
    defineModel: string[];
    defineOptions: string[];
    withDefaults: string[];
  };
  composables: {
    useAttrs: string[];
    useCssModule: string[];
    useSlots: string[];
    useTemplateRef: string[];
  };
  plugins: VueLanguagePlugin[];
  experimentalModelPropName: Record<string, Record<string, boolean | Record<string, string> | Record<string, string>[]>>;
}
declare const validVersions: readonly [2, 2.1, 2.2];
interface VueLanguagePluginReturn {
  version: typeof validVersions[number];
  name?: string;
  order?: number;
  requiredCompilerOptions?: string[];
  getLanguageId?(fileName: string): string | undefined;
  isValidFile?(fileName: string, languageId: string): boolean;
  parseSFC?(fileName: string, content: string): SFCParseResult | undefined;
  parseSFC2?(fileName: string, languageId: string, content: string): SFCParseResult | undefined;
  updateSFC?(oldResult: SFCParseResult, textChange: {
    start: number;
    end: number;
    newText: string;
  }): SFCParseResult | undefined;
  resolveTemplateCompilerOptions?(options: CompilerOptions): CompilerOptions;
  compileSFCScript?(lang: string, script: string): undefined | undefined;
  compileSFCTemplate?(lang: string, template: string, options: CompilerOptions): CodegenResult | undefined;
  compileSFCStyle?(lang: string, style: string): Pick<Sfc['styles'][number], 'imports' | 'bindings' | 'classNames'> | undefined;
  updateSFCTemplate?(oldResult: CodegenResult, textChange: {
    start: number;
    end: number;
    newText: string;
  }): CodegenResult | undefined;
  getEmbeddedCodes?(fileName: string, sfc: Sfc): {
    id: string;
    lang: string;
  }[];
  resolveEmbeddedCode?(fileName: string, sfc: Sfc, embeddedFile: VueEmbeddedCode): void;
}
type VueLanguagePlugin<T extends Record<string, any> = {}> = (ctx: {
  modules: {
    typescript: typeof typescript_d_exports;
    '@vue/compiler-dom': typeof compiler_dom_d_exports;
  };
  compilerOptions: undefined;
  vueCompilerOptions: VueCompilerOptions;
  config: T;
}) => VueLanguagePluginReturn | VueLanguagePluginReturn[];
interface SfcBlock {
  name: string;
  start: number;
  end: number;
  startTagEnd: number;
  endTagStart: number;
  lang: string;
  content: string;
  attrs: Record<string, string | true>;
}
type SfcBlockAttr = true | {
  text: string;
  offset: number;
  quotes: boolean;
};
interface Sfc {
  content: string;
  comments: string[];
  template: (SfcBlock & {
    ast: RootNode | undefined;
    errors: CompilerError[];
    warnings: CompilerError[];
  }) | undefined;
  script: (SfcBlock & {
    src: SfcBlockAttr | undefined;
    ast: undefined;
  }) | undefined;
  scriptSetup: (SfcBlock & {
    generic: SfcBlockAttr | undefined;
    ast: undefined;
  }) | undefined;
  styles: readonly (SfcBlock & {
    src: SfcBlockAttr | undefined;
    module: SfcBlockAttr | undefined;
    scoped: boolean;
    imports: {
      text: string;
      offset: number;
    }[];
    bindings: {
      text: string;
      offset: number;
    }[];
    classNames: {
      text: string;
      offset: number;
    }[];
  })[];
  customBlocks: readonly (SfcBlock & {
    type: string;
  })[];
}
declare module '@vue/compiler-sfc' {
  interface SFCBlock {
    __src?: SfcBlockAttr;
  }
  interface SFCScriptBlock {
    __generic?: SfcBlockAttr;
  }
  interface SFCStyleBlock {
    __module?: SfcBlockAttr;
  }
}
//#endregion
//#region ../../node_modules/.pnpm/@vue+language-core@3.2.4/node_modules/@vue/language-core/lib/utils/parseSfc.d.ts
declare module '@vue/compiler-sfc' {
  interface SFCDescriptor {
    comments: string[];
  }
}
//#endregion
export { RawVueCompilerOptions as t };