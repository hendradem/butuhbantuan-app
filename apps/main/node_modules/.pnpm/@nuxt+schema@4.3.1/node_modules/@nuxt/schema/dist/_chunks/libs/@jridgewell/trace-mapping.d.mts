//#region ../../node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/types/sourcemap-segment.d.mts
type GeneratedColumn = number;
type SourcesIndex = number;
type SourceLine = number;
type SourceColumn = number;
type NamesIndex = number;
type SourceMapSegment = [GeneratedColumn] | [GeneratedColumn, SourcesIndex, SourceLine, SourceColumn] | [GeneratedColumn, SourcesIndex, SourceLine, SourceColumn, NamesIndex];
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/types/types.d.mts
interface SourceMapV3 {
  file?: string | null;
  names: string[];
  sourceRoot?: string;
  sources: (string | null)[];
  sourcesContent?: (string | null)[];
  version: 3;
  ignoreList?: number[];
}
interface EncodedSourceMap extends SourceMapV3 {
  mappings: string;
}
interface DecodedSourceMap extends SourceMapV3 {
  mappings: SourceMapSegment[][];
}
interface Section {
  offset: {
    line: number;
    column: number;
  };
  map: EncodedSourceMap | DecodedSourceMap | SectionedSourceMap;
}
interface SectionedSourceMap {
  file?: string | null;
  sections: Section[];
  version: 3;
}
type XInput = {
  x_google_ignoreList?: SourceMapV3['ignoreList'];
};
type EncodedSourceMapXInput = EncodedSourceMap & XInput;
type DecodedSourceMapXInput = DecodedSourceMap & XInput;
type SectionedSourceMapXInput = Omit<SectionedSourceMap, 'sections'> & {
  sections: SectionXInput[];
};
type SectionXInput = Omit<Section, 'map'> & {
  map: SectionedSourceMapInput;
};
type SourceMapInput = string | EncodedSourceMapXInput | DecodedSourceMapXInput | TraceMap;
type SectionedSourceMapInput = SourceMapInput | SectionedSourceMapXInput;
declare abstract class SourceMap {
  version: SourceMapV3['version'];
  file: SourceMapV3['file'];
  names: SourceMapV3['names'];
  sourceRoot: SourceMapV3['sourceRoot'];
  sources: SourceMapV3['sources'];
  sourcesContent: SourceMapV3['sourcesContent'];
  resolvedSources: SourceMapV3['sources'];
  ignoreList: SourceMapV3['ignoreList'];
}
type Ro<T> = T extends Array<infer V> ? V[] | Readonly<V[]> | RoArray<V> | Readonly<RoArray<V>> : T extends object ? T | Readonly<T> | RoObject<T> | Readonly<RoObject<T>> : T;
type RoArray<T> = Ro<T>[];
type RoObject<T> = { [K in keyof T]: T[K] | Ro<T[K]> };
//#endregion
//#region ../../node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/types/trace-mapping.d.mts
declare class TraceMap implements SourceMap {
  version: SourceMapV3['version'];
  file: SourceMapV3['file'];
  names: SourceMapV3['names'];
  sourceRoot: SourceMapV3['sourceRoot'];
  sources: SourceMapV3['sources'];
  sourcesContent: SourceMapV3['sourcesContent'];
  ignoreList: SourceMapV3['ignoreList'];
  resolvedSources: string[];
  private _encoded;
  private _decoded;
  private _decodedMemo;
  private _bySources;
  private _bySourceMemos;
  constructor(map: Ro<SourceMapInput>, mapUrl?: string | null);
}
//#endregion
export { SectionedSourceMapInput as t };