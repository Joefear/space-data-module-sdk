import * as flatbuffers from "flatbuffers";
/**
 * Pins a plugin version into a deployable bundle.
 */
export declare class PluginVersionBinding implements flatbuffers.IUnpackableObject<PluginVersionBindingT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): PluginVersionBinding;
  static getRootAsPluginVersionBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: PluginVersionBinding,
  ): PluginVersionBinding;
  static getSizePrefixedRootAsPluginVersionBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: PluginVersionBinding,
  ): PluginVersionBinding;
  pluginId(): string;
  pluginId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  version(): string | null;
  version(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
  static startPluginVersionBinding(builder: flatbuffers.Builder): void;
  static addPluginId(
    builder: flatbuffers.Builder,
    pluginIdOffset: flatbuffers.Offset,
  ): void;
  static addVersion(
    builder: flatbuffers.Builder,
    versionOffset: flatbuffers.Offset,
  ): void;
  static endPluginVersionBinding(
    builder: flatbuffers.Builder,
  ): flatbuffers.Offset;
  static createPluginVersionBinding(
    builder: flatbuffers.Builder,
    pluginIdOffset: flatbuffers.Offset,
    versionOffset: flatbuffers.Offset,
  ): flatbuffers.Offset;
  unpack(): PluginVersionBindingT;
  unpackTo(_o: PluginVersionBindingT): void;
}
export declare class PluginVersionBindingT
  implements flatbuffers.IGeneratedObject
{
  pluginId: string | Uint8Array | null;
  version: string | Uint8Array | null;
  constructor(
    pluginId?: string | Uint8Array | null,
    version?: string | Uint8Array | null,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=plugin-version-binding.d.ts.map
