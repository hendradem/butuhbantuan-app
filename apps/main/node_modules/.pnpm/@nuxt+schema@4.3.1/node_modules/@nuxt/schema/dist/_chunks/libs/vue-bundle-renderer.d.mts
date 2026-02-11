//#region ../../node_modules/.pnpm/vue-bundle-renderer@2.2.0/node_modules/vue-bundle-renderer/dist/shared/vue-bundle-renderer.lFgxeLN7.d.ts
interface ResourceMeta {
  src?: string;
  file: string;
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
  name?: string;
  names?: string[];
  isDynamicEntry?: boolean;
  sideEffects?: boolean;
  imports?: string[];
  dynamicImports?: string[];
  module?: boolean;
  prefetch?: boolean;
  preload?: boolean;
  resourceType?: 'audio' | 'document' | 'embed' | 'fetch' | 'font' | 'image' | 'object' | 'script' | 'style' | 'track' | 'worker' | 'video';
  mimeType?: string;
}
interface Manifest {
  [key: string]: ResourceMeta;
}
//#endregion
export { Manifest as t };