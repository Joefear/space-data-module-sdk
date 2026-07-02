import * as flatbuffers from "flatbuffers";
import { BackpressurePolicy } from "./backpressure-policy.js";
/**
 * Binds a trigger to a node input port.
 */
export declare class TriggerBinding implements flatbuffers.IUnpackableObject<TriggerBindingT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): TriggerBinding;
  static getRootAsTriggerBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: TriggerBinding,
  ): TriggerBinding;
  static getSizePrefixedRootAsTriggerBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: TriggerBinding,
  ): TriggerBinding;
  triggerId(): string;
  triggerId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  targetNodeId(): string;
  targetNodeId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  targetPortId(): string;
  targetPortId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  backpressurePolicy(): BackpressurePolicy;
  queueDepth(): number;
  static startTriggerBinding(builder: flatbuffers.Builder): void;
  static addTriggerId(
    builder: flatbuffers.Builder,
    triggerIdOffset: flatbuffers.Offset,
  ): void;
  static addTargetNodeId(
    builder: flatbuffers.Builder,
    targetNodeIdOffset: flatbuffers.Offset,
  ): void;
  static addTargetPortId(
    builder: flatbuffers.Builder,
    targetPortIdOffset: flatbuffers.Offset,
  ): void;
  static addBackpressurePolicy(
    builder: flatbuffers.Builder,
    backpressurePolicy: BackpressurePolicy,
  ): void;
  static addQueueDepth(builder: flatbuffers.Builder, queueDepth: number): void;
  static endTriggerBinding(builder: flatbuffers.Builder): flatbuffers.Offset;
  static createTriggerBinding(
    builder: flatbuffers.Builder,
    triggerIdOffset: flatbuffers.Offset,
    targetNodeIdOffset: flatbuffers.Offset,
    targetPortIdOffset: flatbuffers.Offset,
    backpressurePolicy: BackpressurePolicy,
    queueDepth: number,
  ): flatbuffers.Offset;
  unpack(): TriggerBindingT;
  unpackTo(_o: TriggerBindingT): void;
}
export declare class TriggerBindingT implements flatbuffers.IGeneratedObject {
  triggerId: string | Uint8Array | null;
  targetNodeId: string | Uint8Array | null;
  targetPortId: string | Uint8Array | null;
  backpressurePolicy: BackpressurePolicy;
  queueDepth: number;
  constructor(
    triggerId?: string | Uint8Array | null,
    targetNodeId?: string | Uint8Array | null,
    targetPortId?: string | Uint8Array | null,
    backpressurePolicy?: BackpressurePolicy,
    queueDepth?: number,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=trigger-binding.d.ts.map
