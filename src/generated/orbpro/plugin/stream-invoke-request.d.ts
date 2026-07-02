import * as flatbuffers from "flatbuffers";
import { DrainPolicy } from "../manifest/drain-policy.js";
import {
  TypedArenaBuffer,
  TypedArenaBufferT,
} from "../stream/typed-arena-buffer.js";
/**
 * Generic stream-based method invocation request.
 */
export declare class StreamInvokeRequest implements flatbuffers.IUnpackableObject<StreamInvokeRequestT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): StreamInvokeRequest;
  static getRootAsStreamInvokeRequest(
    bb: flatbuffers.ByteBuffer,
    obj?: StreamInvokeRequest,
  ): StreamInvokeRequest;
  static getSizePrefixedRootAsStreamInvokeRequest(
    bb: flatbuffers.ByteBuffer,
    obj?: StreamInvokeRequest,
  ): StreamInvokeRequest;
  /**
   * Stable target method identifier from PluginManifest.
   */
  methodId(): string;
  methodId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  /**
   * Input FlatBuffer frames grouped as a vector of descriptors.
   */
  inputs(index: number, obj?: TypedArenaBuffer): TypedArenaBuffer | null;
  inputsLength(): number;
  /**
   * Maximum number of output frames the caller is prepared to accept.
   */
  outputStreamCap(): number;
  /**
   * Drain policy requested for this call.
   */
  drainPolicy(): DrainPolicy;
  static startStreamInvokeRequest(builder: flatbuffers.Builder): void;
  static addMethodId(
    builder: flatbuffers.Builder,
    methodIdOffset: flatbuffers.Offset,
  ): void;
  static addInputs(
    builder: flatbuffers.Builder,
    inputsOffset: flatbuffers.Offset,
  ): void;
  static createInputsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startInputsVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addOutputStreamCap(
    builder: flatbuffers.Builder,
    outputStreamCap: number,
  ): void;
  static addDrainPolicy(
    builder: flatbuffers.Builder,
    drainPolicy: DrainPolicy,
  ): void;
  static endStreamInvokeRequest(
    builder: flatbuffers.Builder,
  ): flatbuffers.Offset;
  static createStreamInvokeRequest(
    builder: flatbuffers.Builder,
    methodIdOffset: flatbuffers.Offset,
    inputsOffset: flatbuffers.Offset,
    outputStreamCap: number,
    drainPolicy: DrainPolicy,
  ): flatbuffers.Offset;
  unpack(): StreamInvokeRequestT;
  unpackTo(_o: StreamInvokeRequestT): void;
}
export declare class StreamInvokeRequestT
  implements flatbuffers.IGeneratedObject
{
  methodId: string | Uint8Array | null;
  inputs: TypedArenaBufferT[];
  outputStreamCap: number;
  drainPolicy: DrainPolicy;
  constructor(
    methodId?: string | Uint8Array | null,
    inputs?: TypedArenaBufferT[],
    outputStreamCap?: number,
    drainPolicy?: DrainPolicy,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=stream-invoke-request.d.ts.map
