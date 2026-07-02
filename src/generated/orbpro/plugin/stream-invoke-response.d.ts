import * as flatbuffers from "flatbuffers";
import {
  TypedArenaBuffer,
  TypedArenaBufferT,
} from "../stream/typed-arena-buffer.js";
/**
 * Generic stream-based method invocation result.
 */
export declare class StreamInvokeResponse implements flatbuffers.IUnpackableObject<StreamInvokeResponseT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): StreamInvokeResponse;
  static getRootAsStreamInvokeResponse(
    bb: flatbuffers.ByteBuffer,
    obj?: StreamInvokeResponse,
  ): StreamInvokeResponse;
  static getSizePrefixedRootAsStreamInvokeResponse(
    bb: flatbuffers.ByteBuffer,
    obj?: StreamInvokeResponse,
  ): StreamInvokeResponse;
  /**
   * Output FlatBuffer frames produced by the method.
   */
  outputs(index: number, obj?: TypedArenaBuffer): TypedArenaBuffer | null;
  outputsLength(): number;
  /**
   * Number of queued input frames still waiting upstream after this call.
   */
  backlogRemaining(): number;
  /**
   * True when the runtime yielded before fully draining the input backlog.
   */
  yielded(): boolean;
  /**
   * Error code (0 = success).
   */
  errorCode(): number;
  /**
   * Error message if `error_code != 0`.
   */
  errorMessage(): string | null;
  errorMessage(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  static startStreamInvokeResponse(builder: flatbuffers.Builder): void;
  static addOutputs(
    builder: flatbuffers.Builder,
    outputsOffset: flatbuffers.Offset,
  ): void;
  static createOutputsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startOutputsVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addBacklogRemaining(
    builder: flatbuffers.Builder,
    backlogRemaining: number,
  ): void;
  static addYielded(builder: flatbuffers.Builder, yielded: boolean): void;
  static addErrorCode(builder: flatbuffers.Builder, errorCode: number): void;
  static addErrorMessage(
    builder: flatbuffers.Builder,
    errorMessageOffset: flatbuffers.Offset,
  ): void;
  static endStreamInvokeResponse(
    builder: flatbuffers.Builder,
  ): flatbuffers.Offset;
  static createStreamInvokeResponse(
    builder: flatbuffers.Builder,
    outputsOffset: flatbuffers.Offset,
    backlogRemaining: number,
    yielded: boolean,
    errorCode: number,
    errorMessageOffset: flatbuffers.Offset,
  ): flatbuffers.Offset;
  unpack(): StreamInvokeResponseT;
  unpackTo(_o: StreamInvokeResponseT): void;
}
export declare class StreamInvokeResponseT
  implements flatbuffers.IGeneratedObject
{
  outputs: TypedArenaBufferT[];
  backlogRemaining: number;
  yielded: boolean;
  errorCode: number;
  errorMessage: string | Uint8Array | null;
  constructor(
    outputs?: TypedArenaBufferT[],
    backlogRemaining?: number,
    yielded?: boolean,
    errorCode?: number,
    errorMessage?: string | Uint8Array | null,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=stream-invoke-response.d.ts.map
