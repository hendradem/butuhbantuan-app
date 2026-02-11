import * as unifont from 'unifont';
import { F as FontProvider } from './shared/fonts.3NiAstD9.mjs';
import '@nuxt/schema';
import 'fontless';

/**
 * @deprecated Use `defineFontProvider` from `unifont` instead.
 */
declare function defineFontProvider(options: FontProvider): FontProvider<Record<string, unknown>>;

declare function toUnifontProvider<FontProviderOptions = Record<string, unknown>>(name: string, provider: FontProvider<FontProviderOptions>): unifont.ProviderFactory<FontProviderOptions>;

export { FontProvider, defineFontProvider, toUnifontProvider };
