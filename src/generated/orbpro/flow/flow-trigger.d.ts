import * as flatbuffers from "flatbuffers";
import { TriggerKind } from "./trigger-kind.js";
import {
  FlatBufferTypeRef,
  FlatBufferTypeRefT,
} from "../stream/flat-buffer-type-ref.js";
/**
 * One runtime trigger definition.
 */
export declare class FlowTrigger implements flatbuffers.IUnpackableObject<FlowTriggerT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): FlowTrigger;
  static getRootAsFlowTrigger(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowTrigger,
  ): FlowTrigger;
  static getSizePrefixedRootAsFlowTrigger(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowTrigger,
  ): FlowTrigger;
  triggerId(): string;
  triggerId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  kind(): TriggerKind;
  source(): string | null;
  source(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
  protocolId(): string | null;
  protocolId(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  defaultIntervalMs(): bigint;
  acceptedTypes(
    index: number,
    obj?: FlatBufferTypeRef,
  ): FlatBufferTypeRef | null;
  acceptedTypesLength(): number;
  description(): string | null;
  description(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  static startFlowTrigger(builder: flatbuffers.Builder): void;
  static addTriggerId(
    builder: flatbuffers.Builder,
    triggerIdOffset: flatbuffers.Offset,
  ): void;
  static addKind(builder: flatbuffers.Builder, kind: TriggerKind): void;
  static addSource(
    builder: flatbuffers.Builder,
    sourceOffset: flatbuffers.Offset,
  ): void;
  static addProtocolId(
    builder: flatbuffers.Builder,
    protocolIdOffset: flatbuffers.Offset,
  ): void;
  static addDefaultIntervalMs(
    builder: flatbuffers.Builder,
    defaultIntervalMs: bigint,
  ): void;
  static addAcceptedTypes(
    builder: flatbuffers.Builder,
    acceptedTypesOffset: flatbuffers.Offset,
  ): void;
  static createAcceptedTypesVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startAcceptedTypesVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addDescription(
    builder: flatbuffers.Builder,
    descriptionOffset: flatbuffers.Offset,
  ): void;
  static endFlowTrigger(builder: flatbuffers.Builder): flatbuffers.Offset;
  static createFlowTrigger(
    builder: flatbuffers.Builder,
    triggerIdOffset: flatbuffers.Offset,
    kind: TriggerKind,
    sourceOffset: flatbuffers.Offset,
    protocolIdOffset: flatbuffers.Offset,
    defaultIntervalMs: bigint,
    acceptedTypesOffset: flatbuffers.Offset,
    descriptionOffset: flatbuffers.Offset,
  ): flatbuffers.Offset;
  unpack(): FlowTriggerT;
  unpackTo(_o: FlowTriggerT): void;
}
export declare class FlowTriggerT implements flatbuffers.IGeneratedObject {
  triggerId: string | Uint8Array | null;
  kind: TriggerKind;
  source: string | Uint8Array | null;
  protocolId: string | Uint8Array | null;
  defaultIntervalMs: bigint;
  acceptedTypes: FlatBufferTypeRefT[];
  description: string | Uint8Array | null;
  constructor(
    triggerId?: string | Uint8Array | null,
    kind?: TriggerKind,
    source?: string | Uint8Array | null,
    protocolId?: string | Uint8Array | null,
    defaultIntervalMs?: bigint,
    acceptedTypes?: FlatBufferTypeRefT[],
    description?: string | Uint8Array | null,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=flow-trigger.d.ts.map
