import * as _nuxt_schema from '@nuxt/schema';
import { M as ModuleHooks, a as ModuleOptions } from './shared/fonts.3NiAstD9.mjs';
export { F as FontProvider } from './shared/fonts.3NiAstD9.mjs';
export { FontFaceData, LocalFontSource, FontFaceData as NormalizedFontFaceData, RemoteFontSource, ResolveFontOptions as ResolveFontFacesOptions, ResolveFontOptions } from 'unifont';
export { FontFallback, FontFamilyManualOverride, FontFamilyOverrides, FontFamilyProviderOverride, FontProviderName, FontSource } from 'fontless';

declare const _default: _nuxt_schema.NuxtModule<ModuleOptions, ModuleOptions, false>;

declare module '@nuxt/schema' {
    interface NuxtHooks extends ModuleHooks {
    }
}

export { ModuleOptions, _default as default };
