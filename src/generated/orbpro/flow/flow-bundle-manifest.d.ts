import * as flatbuffers from "flatbuffers";
import {
  PluginVersionBinding,
  PluginVersionBindingT,
} from "./plugin-version-binding.js";
import {
  SchemaHashBinding,
  SchemaHashBindingT,
} from "./schema-hash-binding.js";
import { CapabilityKind } from "../manifest/capability-kind.js";
/**
 * Bundle manifest for compiled flow deployment.
 */
export declare class FlowBundleManifest implements flatbuffers.IUnpackableObject<FlowBundleManifestT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): FlowBundleManifest;
  static getRootAsFlowBundleManifest(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowBundleManifest,
  ): FlowBundleManifest;
  static getSizePrefixedRootAsFlowBundleManifest(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowBundleManifest,
  ): FlowBundleManifest;
  bundleId(): string;
  bundleId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  programId(): string;
  programId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  graphHash(index: number): number | null;
  graphHashLength(): number;
  graphHashArray(): Uint8Array | null;
  pluginVersions(
    index: number,
    obj?: PluginVersionBinding,
  ): PluginVersionBinding | null;
  pluginVersionsLength(): number;
  schemaHashes(
    index: number,
    obj?: SchemaHashBinding,
  ): SchemaHashBinding | null;
  schemaHashesLength(): number;
  requiredCapabilities(index: number): CapabilityKind | null;
  requiredCapabilitiesLength(): number;
  requiredCapabilitiesArray(): Uint16Array | null;
  abiVersion(): number;
  static startFlowBundleManifest(builder: flatbuffers.Builder): void;
  static addBundleId(
    builder: flatbuffers.Builder,
    bundleIdOffset: flatbuffers.Offset,
  ): void;
  static addProgramId(
    builder: flatbuffers.Builder,
    programIdOffset: flatbuffers.Offset,
  ): void;
  static addGraphHash(
    builder: flatbuffers.Builder,
    graphHashOffset: flatbuffers.Offset,
  ): void;
  static createGraphHashVector(
    builder: flatbuffers.Builder,
    data: number[] | Uint8Array,
  ): flatbuffers.Offset;
  static startGraphHashVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addPluginVersions(
    builder: flatbuffers.Builder,
    pluginVersionsOffset: flatbuffers.Offset,
  ): void;
  static createPluginVersionsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startPluginVersionsVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addSchemaHashes(
    builder: flatbuffers.Builder,
    schemaHashesOffset: flatbuffers.Offset,
  ): void;
  static createSchemaHashesVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startSchemaHashesVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addRequiredCapabilities(
    builder: flatbuffers.Builder,
    requiredCapabilitiesOffset: flatbuffers.Offset,
  ): void;
  static createRequiredCapabilitiesVector(
    builder: flatbuffers.Builder,
    data: CapabilityKind[],
  ): flatbuffers.Offset;
  static startRequiredCapabilitiesVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addAbiVersion(builder: flatbuffers.Builder, abiVersion: number): void;
  static endFlowBundleManifest(
    builder: flatbuffers.Builder,
  ): flatbuffers.Offset;
  static createFlowBundleManifest(
    builder: flatbuffers.Builder,
    bundleIdOffset: flatbuffers.Offset,
    programIdOffset: flatbuffers.Offset,
    graphHashOffset: flatbuffers.Offset,
    pluginVersionsOffset: flatbuffers.Offset,
    schemaHashesOffset: flatbuffers.Offset,
    requiredCapabilitiesOffset: flatbuffers.Offset,
    abiVersion: number,
  ): flatbuffers.Offset;
  unpack(): FlowBundleManifestT;
  unpackTo(_o: FlowBundleManifestT): void;
}
export declare class FlowBundleManifestT
  implements flatbuffers.IGeneratedObject
{
  bundleId: string | Uint8Array | null;
  programId: string | Uint8Array | null;
  graphHash: number[];
  pluginVersions: PluginVersionBindingT[];
  schemaHashes: SchemaHashBindingT[];
  requiredCapabilities: CapabilityKind[];
  abiVersion: number;
  constructor(
    bundleId?: string | Uint8Array | null,
    programId?: string | Uint8Array | null,
    graphHash?: number[],
    pluginVersions?: PluginVersionBindingT[],
    schemaHashes?: SchemaHashBindingT[],
    requiredCapabilities?: CapabilityKind[],
    abiVersion?: number,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=flow-bundle-manifest.d.ts.map
