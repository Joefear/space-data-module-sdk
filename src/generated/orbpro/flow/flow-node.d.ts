import * as flatbuffers from "flatbuffers";
import { NodeKind } from "./node-kind.js";
import { DrainPolicy } from "../manifest/drain-policy.js";
/**
 * One plugin-backed flow node.
 */
export declare class FlowNode implements flatbuffers.IUnpackableObject<FlowNodeT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): FlowNode;
  static getRootAsFlowNode(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowNode,
  ): FlowNode;
  static getSizePrefixedRootAsFlowNode(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowNode,
  ): FlowNode;
  nodeId(): string;
  nodeId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  pluginId(): string;
  pluginId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  methodId(): string;
  methodId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  kind(): NodeKind;
  drainPolicy(): DrainPolicy;
  timeSliceMicros(): number;
  static startFlowNode(builder: flatbuffers.Builder): void;
  static addNodeId(
    builder: flatbuffers.Builder,
    nodeIdOffset: flatbuffers.Offset,
  ): void;
  static addPluginId(
    builder: flatbuffers.Builder,
    pluginIdOffset: flatbuffers.Offset,
  ): void;
  static addMethodId(
    builder: flatbuffers.Builder,
    methodIdOffset: flatbuffers.Offset,
  ): void;
  static addKind(builder: flatbuffers.Builder, kind: NodeKind): void;
  static addDrainPolicy(
    builder: flatbuffers.Builder,
    drainPolicy: DrainPolicy,
  ): void;
  static addTimeSliceMicros(
    builder: flatbuffers.Builder,
    timeSliceMicros: number,
  ): void;
  static endFlowNode(builder: flatbuffers.Builder): flatbuffers.Offset;
  static createFlowNode(
    builder: flatbuffers.Builder,
    nodeIdOffset: flatbuffers.Offset,
    pluginIdOffset: flatbuffers.Offset,
    methodIdOffset: flatbuffers.Offset,
    kind: NodeKind,
    drainPolicy: DrainPolicy,
    timeSliceMicros: number,
  ): flatbuffers.Offset;
  unpack(): FlowNodeT;
  unpackTo(_o: FlowNodeT): void;
}
export declare class FlowNodeT implements flatbuffers.IGeneratedObject {
  nodeId: string | Uint8Array | null;
  pluginId: string | Uint8Array | null;
  methodId: string | Uint8Array | null;
  kind: NodeKind;
  drainPolicy: DrainPolicy;
  timeSliceMicros: number;
  constructor(
    nodeId?: string | Uint8Array | null,
    pluginId?: string | Uint8Array | null,
    methodId?: string | Uint8Array | null,
    kind?: NodeKind,
    drainPolicy?: DrainPolicy,
    timeSliceMicros?: number,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=flow-node.d.ts.map
