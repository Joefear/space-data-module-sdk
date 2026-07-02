import * as flatbuffers from "flatbuffers";
import { BackpressurePolicy } from "./backpressure-policy.js";
import {
  FlatBufferTypeRef,
  FlatBufferTypeRefT,
} from "../stream/flat-buffer-type-ref.js";
/**
 * One directed edge between node ports.
 */
export declare class FlowEdge implements flatbuffers.IUnpackableObject<FlowEdgeT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): FlowEdge;
  static getRootAsFlowEdge(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowEdge,
  ): FlowEdge;
  static getSizePrefixedRootAsFlowEdge(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowEdge,
  ): FlowEdge;
  edgeId(): string;
  edgeId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  fromNodeId(): string;
  fromNodeId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  fromPortId(): string;
  fromPortId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  toNodeId(): string;
  toNodeId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  toPortId(): string;
  toPortId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  acceptedTypes(
    index: number,
    obj?: FlatBufferTypeRef,
  ): FlatBufferTypeRef | null;
  acceptedTypesLength(): number;
  backpressurePolicy(): BackpressurePolicy;
  queueDepth(): number;
  static startFlowEdge(builder: flatbuffers.Builder): void;
  static addEdgeId(
    builder: flatbuffers.Builder,
    edgeIdOffset: flatbuffers.Offset,
  ): void;
  static addFromNodeId(
    builder: flatbuffers.Builder,
    fromNodeIdOffset: flatbuffers.Offset,
  ): void;
  static addFromPortId(
    builder: flatbuffers.Builder,
    fromPortIdOffset: flatbuffers.Offset,
  ): void;
  static addToNodeId(
    builder: flatbuffers.Builder,
    toNodeIdOffset: flatbuffers.Offset,
  ): void;
  static addToPortId(
    builder: flatbuffers.Builder,
    toPortIdOffset: flatbuffers.Offset,
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
  static addBackpressurePolicy(
    builder: flatbuffers.Builder,
    backpressurePolicy: BackpressurePolicy,
  ): void;
  static addQueueDepth(builder: flatbuffers.Builder, queueDepth: number): void;
  static endFlowEdge(builder: flatbuffers.Builder): flatbuffers.Offset;
  static createFlowEdge(
    builder: flatbuffers.Builder,
    edgeIdOffset: flatbuffers.Offset,
    fromNodeIdOffset: flatbuffers.Offset,
    fromPortIdOffset: flatbuffers.Offset,
    toNodeIdOffset: flatbuffers.Offset,
    toPortIdOffset: flatbuffers.Offset,
    acceptedTypesOffset: flatbuffers.Offset,
    backpressurePolicy: BackpressurePolicy,
    queueDepth: number,
  ): flatbuffers.Offset;
  unpack(): FlowEdgeT;
  unpackTo(_o: FlowEdgeT): void;
}
export declare class FlowEdgeT implements flatbuffers.IGeneratedObject {
  edgeId: string | Uint8Array | null;
  fromNodeId: string | Uint8Array | null;
  fromPortId: string | Uint8Array | null;
  toNodeId: string | Uint8Array | null;
  toPortId: string | Uint8Array | null;
  acceptedTypes: FlatBufferTypeRefT[];
  backpressurePolicy: BackpressurePolicy;
  queueDepth: number;
  constructor(
    edgeId?: string | Uint8Array | null,
    fromNodeId?: string | Uint8Array | null,
    fromPortId?: string | Uint8Array | null,
    toNodeId?: string | Uint8Array | null,
    toPortId?: string | Uint8Array | null,
    acceptedTypes?: FlatBufferTypeRefT[],
    backpressurePolicy?: BackpressurePolicy,
    queueDepth?: number,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=flow-edge.d.ts.map
