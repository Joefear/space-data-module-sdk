import * as flatbuffers from "../vendor/flatbuffers/flatbuffers.js";

import {
  PluginInvokeRequest,
  PluginInvokeRequestT,
} from "../generated/orbpro/invoke/plugin-invoke-request.js";
import {
  PluginInvokeResponse,
  PluginInvokeResponseT,
} from "../generated/orbpro/invoke/plugin-invoke-response.js";
import { InvokeSurface } from "../generated/orbpro/manifest/invoke-surface.js";
import { BufferMutability } from "../generated/orbpro/stream/buffer-mutability.js";
import { BufferOwnership } from "../generated/orbpro/stream/buffer-ownership.js";
import { FlatBufferTypeRefT } from "../generated/orbpro/stream/flat-buffer-type-ref.js";
import { TypedArenaBufferT } from "../generated/orbpro/stream/typed-arena-buffer.js";
import { toUint8Array } from "../runtime/bufferLike.js";
import { PIV, PIVT } from "spacedatastandards.org/lib/js/PIV/PIV.js";
import { PIVRequestT } from "spacedatastandards.org/lib/js/PIV/PIVRequest.js";
import { PIVResponseT } from "spacedatastandards.org/lib/js/PIV/PIVResponse.js";
import { TABT as SdsTABT } from "spacedatastandards.org/lib/js/PIV/TAB.js";
import { FlatBufferTypeRefT as SdsFlatBufferTypeRefT } from "spacedatastandards.org/lib/js/PIV/FlatBufferTypeRef.js";
import { bufferMutability as SdsBufferMutability } from "spacedatastandards.org/lib/js/PIV/bufferMutability.js";
import { bufferOwnership as SdsBufferOwnership } from "spacedatastandards.org/lib/js/PIV/bufferOwnership.js";
import { payloadWireFormat as SdsPayloadWireFormat } from "spacedatastandards.org/lib/js/PIV/payloadWireFormat.js";
import { pivStatus as SdsPivStatus } from "spacedatastandards.org/lib/js/PIV/pivStatus.js";

function toByteBuffer(data) {
  if (data instanceof flatbuffers.ByteBuffer) {
    return data;
  }
  const bytes = toUint8Array(data);
  if (bytes) {
    return new flatbuffers.ByteBuffer(bytes);
  }
  throw new TypeError(
    "Expected ByteBuffer, Uint8Array, ArrayBufferView, or ArrayBuffer.",
  );
}

function normalizeSchemaHash(value) {
  if (!value) {
    return [];
  }
  if (value instanceof Uint8Array) {
    return Array.from(value);
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  if (Array.isArray(value)) {
    return value.map((byte) => Number(byte) & 0xff);
  }
  const normalized = String(value).trim().replace(/^0x/i, "");
  if (!normalized || normalized.length % 2 !== 0) {
    return [];
  }
  const bytes = [];
  for (let index = 0; index < normalized.length; index += 2) {
    bytes.push(parseInt(normalized.slice(index, index + 2), 16));
  }
  return bytes;
}

function normalizeUnsignedInteger(value, fallback = 0) {
  const normalized = Number(value ?? fallback);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(normalized));
}

function normalizeBigInt(value, fallback = BigInt(0)) {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value.trim());
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizePayloadWireFormat(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    value === 1 ||
    normalized === "aligned-binary" ||
    normalized === "aligned_binary"
  ) {
    return "aligned-binary";
  }
  return "flatbuffer";
}

function toLegacyFlatBufferTypeRefT(value = {}, payloadLength = 0) {
  if (value instanceof FlatBufferTypeRefT) {
    return value;
  }
  const wireFormat = normalizePayloadWireFormat(value.wireFormat);
  const requiredAlignment = normalizeUnsignedInteger(value.requiredAlignment);
  const fixedStringLength = normalizeUnsignedInteger(value.fixedStringLength);
  const byteLength =
    wireFormat === "aligned-binary"
      ? normalizeUnsignedInteger(value.byteLength, payloadLength)
      : normalizeUnsignedInteger(value.byteLength);
  return new FlatBufferTypeRefT(
    value.schemaName ?? null,
    value.fileIdentifier ?? null,
    normalizeSchemaHash(value.schemaHash),
    value.acceptsAnyFlatbuffer === true,
    wireFormat,
    value.rootTypeName ?? null,
    fixedStringLength,
    byteLength,
    requiredAlignment,
  );
}

function toSdsWireFormat(value) {
  return normalizePayloadWireFormat(value) === "aligned-binary"
    ? SdsPayloadWireFormat.ALIGNED_BINARY
    : SdsPayloadWireFormat.FLATBUFFER;
}

function fromSdsWireFormat(value) {
  return value === SdsPayloadWireFormat.ALIGNED_BINARY
    ? "aligned-binary"
    : "flatbuffer";
}

function toSdsMutability(value) {
  if (
    value === BufferMutability.APPEND_ONLY ||
    value === "append-only" ||
    value === "APPEND_ONLY"
  ) {
    return SdsBufferMutability.APPEND_ONLY;
  }
  if (
    value === BufferMutability.MUTABLE ||
    value === "mutable" ||
    value === "single-writer-mutable" ||
    value === "SINGLE_WRITER_MUTABLE"
  ) {
    return SdsBufferMutability.SINGLE_WRITER_MUTABLE;
  }
  return SdsBufferMutability.IMMUTABLE;
}

function fromSdsMutability(value) {
  if (value === SdsBufferMutability.APPEND_ONLY) {
    return BufferMutability.APPEND_ONLY;
  }
  if (value === SdsBufferMutability.SINGLE_WRITER_MUTABLE) {
    return BufferMutability.MUTABLE;
  }
  return BufferMutability.IMMUTABLE;
}

function toSdsOwnership(value) {
  if (
    value === BufferOwnership.PRODUCER_OWNED ||
    value === "plugin-owned" ||
    value === "PLUGIN_OWNED"
  ) {
    return SdsBufferOwnership.PLUGIN_OWNED;
  }
  if (
    value === "transferred" ||
    value === "TRANSFERRED"
  ) {
    return SdsBufferOwnership.TRANSFERRED;
  }
  return SdsBufferOwnership.HOST_OWNED;
}

function fromSdsOwnership(value) {
  if (value === SdsBufferOwnership.PLUGIN_OWNED) {
    return BufferOwnership.PRODUCER_OWNED;
  }
  return BufferOwnership.HOST_OWNED;
}

function toSdsFlatBufferTypeRefT(value = {}) {
  if (value instanceof SdsFlatBufferTypeRefT) {
    return value;
  }
  return new SdsFlatBufferTypeRefT(
    value.schemaName ?? value.SCHEMA_NAME ?? null,
    value.fileIdentifier ?? value.FILE_IDENTIFIER ?? null,
    value.schemaVersion ?? value.SCHEMA_VERSION ?? null,
    value.rootTypeName ?? value.rootType ?? value.ROOT_TYPE ?? null,
  );
}

function encodeSdsFrameId(frame = {}) {
  if (
    frame.sequence !== undefined ||
    frame.endOfStream !== undefined ||
    frame.endOfStream === true
  ) {
    const sequence = normalizeBigInt(frame.sequence);
    return (sequence << BigInt(1)) | (frame.endOfStream === true ? BigInt(1) : BigInt(0));
  }
  return normalizeBigInt(frame.frameId ?? frame.traceId);
}

function decodeSdsFrameId(frameId) {
  const normalized = normalizeBigInt(frameId);
  return {
    sequence: normalized >> BigInt(1),
    endOfStream: (normalized & BigInt(1)) === BigInt(1),
  };
}

function alignOffset(offset, alignment) {
  if (alignment <= 1) {
    return offset;
  }
  const remainder = offset % alignment;
  return remainder === 0 ? offset : offset + alignment - remainder;
}

function arenaFrameOffset(frame) {
  return normalizeUnsignedInteger(frame?.offset ?? frame?.OFFSET);
}

function arenaFrameSize(frame) {
  return normalizeUnsignedInteger(frame?.size ?? frame?.SIZE);
}

function normalizeLegacyArenaFrame(frame = {}, offset) {
  const payload = toUint8Array(frame.payload ?? new Uint8Array()) ?? new Uint8Array();
  const typeRef = toLegacyFlatBufferTypeRefT(frame.typeRef ?? frame.allowedType ?? {}, payload.length);
  const alignment = Math.max(
    1,
    normalizeUnsignedInteger(
      frame.alignment,
      typeRef.requiredAlignment > 0 ? typeRef.requiredAlignment : 8,
    ),
  );
  const alignedOffset = alignOffset(offset, alignment);
  return {
    payload,
    padding: alignedOffset - offset,
    buffer: new TypedArenaBufferT(
      typeRef,
      frame.portId ?? null,
      alignment,
      alignedOffset,
      payload.length,
      frame.ownership ?? BufferOwnership.BORROWED,
      normalizeUnsignedInteger(frame.generation),
      frame.mutability ?? BufferMutability.IMMUTABLE,
      normalizeBigInt(frame.traceId),
      normalizeUnsignedInteger(frame.streamId),
      normalizeBigInt(frame.sequence),
      frame.endOfStream === true,
    ),
  };
}

function normalizeSdsArenaFrame(frame = {}, offset) {
  const payload = toUint8Array(frame.payload ?? new Uint8Array()) ?? new Uint8Array();
  const typeRefInput = frame.typeRef ?? frame.allowedType ?? {};
  const wireFormat = toSdsWireFormat(typeRefInput.wireFormat ?? frame.wireFormat);
  const requiredAlignment = normalizeUnsignedInteger(
    typeRefInput.requiredAlignment ?? frame.requiredAlignment,
  );
  const alignment = Math.max(
    1,
    normalizeUnsignedInteger(frame.alignment, requiredAlignment > 0 ? requiredAlignment : 8),
  );
  const alignedOffset = alignOffset(offset, alignment);
  return {
    payload,
    padding: alignedOffset - offset,
    buffer: new SdsTABT(
      alignedOffset,
      payload.length,
      alignment,
      wireFormat,
      toSdsFlatBufferTypeRefT(typeRefInput),
      toSdsMutability(frame.mutability),
      toSdsOwnership(frame.ownership),
      encodeSdsFrameId(frame),
      frame.portId ?? null,
    ),
  };
}

function packArenaFrames(frames = [], normalizeFrame = normalizeSdsArenaFrame) {
  const packedFrames = [];
  const normalizedFrames = [];
  let offset = 0;
  for (const frame of frames) {
    const normalized = normalizeFrame(frame, offset);
    offset = arenaFrameOffset(normalized.buffer) + arenaFrameSize(normalized.buffer);
    packedFrames.push(normalized.buffer);
    normalizedFrames.push(normalized);
  }

  const arena = new Uint8Array(offset);
  for (const normalized of normalizedFrames) {
    arena.set(normalized.payload, arenaFrameOffset(normalized.buffer));
  }
  return {
    frames: packedFrames,
    arena,
  };
}

function materializeArenaFrames(frames = [], arenaBytes) {
  return frames.map((frame) => {
    const offset = normalizeUnsignedInteger(frame.offset);
    const size = normalizeUnsignedInteger(frame.size);
    if (offset > arenaBytes.length || size > arenaBytes.length - offset) {
      throw new Error("Plugin invoke payload range exceeds payload arena.");
    }
    const payload = new Uint8Array(arenaBytes.slice(offset, offset + size));
    return {
      ...frame,
      payload,
      typeRef: frame.typeRef ?? null,
    };
  });
}

function materializeSdsArenaFrames(frames = [], arenaBytes, options = {}) {
  const externalArena = toUint8Array(options.externalArena);
  return frames.map((frame) => {
    const offset = normalizeUnsignedInteger(frame.OFFSET);
    const size = normalizeUnsignedInteger(frame.SIZE);
    const sourceArena = arenaBytes.length > 0 ? arenaBytes : externalArena;
    const sourceDescription =
      arenaBytes.length > 0 ? "PAYLOAD_ARENA" : "external arena";
    if (size > 0 && !sourceArena) {
      throw new Error(
        "SDS PIV external arena bytes are required when PAYLOAD_ARENA is empty.",
      );
    }
    if (
      sourceArena &&
      (offset > sourceArena.length || size > sourceArena.length - offset)
    ) {
      throw new Error(`SDS PIV TAB payload range exceeds ${sourceDescription}.`);
    }
    const payload = sourceArena
      ? new Uint8Array(sourceArena.slice(offset, offset + size))
      : new Uint8Array();
    const wireFormat = fromSdsWireFormat(frame.WIRE_FORMAT);
    const alignment = normalizeUnsignedInteger(frame.ALIGNMENT, 1);
    const streamFrame = decodeSdsFrameId(frame.FRAME_ID);
    return {
      portId: frame.PORT_ID ?? null,
      alignment,
      offset,
      size,
      ownership: fromSdsOwnership(frame.OWNERSHIP),
      generation: 0,
      mutability: fromSdsMutability(frame.MUTABILITY),
      traceId: normalizeBigInt(frame.FRAME_ID),
      streamId: 0,
      sequence: streamFrame.sequence,
      endOfStream: streamFrame.endOfStream,
      payload,
      typeRef: frame.TYPE_REF
        ? {
            schemaName: frame.TYPE_REF.SCHEMA_NAME ?? null,
            fileIdentifier: frame.TYPE_REF.FILE_IDENTIFIER ?? null,
            schemaVersion: frame.TYPE_REF.SCHEMA_VERSION ?? null,
            wireFormat,
            rootTypeName: frame.TYPE_REF.ROOT_TYPE ?? null,
            fixedStringLength: 0,
            byteLength: wireFormat === "aligned-binary" ? size : 0,
            requiredAlignment: alignment,
          }
        : null,
    };
  });
}

function encodeRoot(builderFactory, finish, value) {
  const builder = new flatbuffers.Builder(1024);
  finish(builder, builderFactory(value).pack(builder));
  return builder.asUint8Array();
}

export function encodeLegacyPluginInvokeRequest(request = {}) {
  const { frames, arena } = packArenaFrames(
    Array.isArray(request.inputs) ? request.inputs : request.inputFrames ?? [],
    normalizeLegacyArenaFrame,
  );
  return encodeRoot(
    (value) =>
      new PluginInvokeRequestT(value.methodId ?? null, frames, Array.from(arena)),
    PluginInvokeRequest.finishPluginInvokeRequestBuffer,
    request,
  );
}

export function decodeLegacyPluginInvokeRequest(data) {
  const bb = toByteBuffer(data);
  if (!PluginInvokeRequest.bufferHasIdentifier(bb)) {
    throw new Error("Plugin invoke request buffer identifier mismatch.");
  }
  const unpacked = PluginInvokeRequest.getRootAsPluginInvokeRequest(bb).unpack();
  const arena = Uint8Array.from(unpacked.payloadArena ?? []);
  const inputs = materializeArenaFrames(unpacked.inputFrames ?? [], arena);
  return {
    methodId: unpacked.methodId ?? null,
    inputFrames: inputs,
    inputs,
    payloadArena: arena,
  };
}

export function encodePluginInvokeRequest(request = {}) {
  const { frames, arena } = packArenaFrames(
    Array.isArray(request.inputs) ? request.inputs : request.inputFrames ?? [],
    normalizeSdsArenaFrame,
  );
  return encodeRoot(
    (value) =>
      new PIVT(
        new PIVRequestT(
          value.methodId ?? null,
          frames,
          Array.from(arena),
          normalizeBigInt(value.traceId),
          normalizeUnsignedInteger(value.outputStreamCap),
        ),
        null,
      ),
    PIV.finishPIVBuffer,
    request,
  );
}

export function decodePluginInvokeRequest(data, options = {}) {
  const bb = toByteBuffer(data);
  if (PIV.bufferHasIdentifier(bb)) {
    const unpacked = PIV.getRootAsPIV(bb).unpack();
    if (!unpacked.REQUEST) {
      throw new Error("SDS PIV invoke envelope does not contain a request.");
    }
    const arena = Uint8Array.from(unpacked.REQUEST.PAYLOAD_ARENA ?? []);
    const inputs = materializeSdsArenaFrames(
      unpacked.REQUEST.INPUTS ?? [],
      arena,
      options,
    );
    return {
      methodId: unpacked.REQUEST.METHOD_ID ?? null,
      inputFrames: inputs,
      inputs,
      payloadArena: arena,
      traceId: unpacked.REQUEST.TRACE_ID ?? BigInt(0),
      outputStreamCap: unpacked.REQUEST.OUTPUT_STREAM_CAP ?? 0,
      envelope: "PIV",
    };
  }
  return {
    ...decodeLegacyPluginInvokeRequest(bb),
    envelope: "PINQ",
  };
}

function resolvePivStatus(response = {}) {
  if (response.status !== undefined) {
    return response.status;
  }
  if (response.yielded === true) {
    return SdsPivStatus.YIELDED;
  }
  if (Number(response.statusCode ?? 0) !== 0 || response.errorCode) {
    return SdsPivStatus.FAILED;
  }
  return SdsPivStatus.OK;
}

export function encodeLegacyPluginInvokeResponse(response = {}) {
  const { frames, arena } = packArenaFrames(
    Array.isArray(response.outputs) ? response.outputs : response.outputFrames ?? [],
    normalizeLegacyArenaFrame,
  );
  return encodeRoot(
    (value) =>
      new PluginInvokeResponseT(
        Number(value.statusCode ?? 0),
        value.yielded === true,
        normalizeUnsignedInteger(value.backlogRemaining),
        frames,
        Array.from(arena),
        value.errorCode ?? null,
        value.errorMessage ?? null,
      ),
    PluginInvokeResponse.finishPluginInvokeResponseBuffer,
    response,
  );
}

export function decodeLegacyPluginInvokeResponse(data) {
  const bb = toByteBuffer(data);
  if (!PluginInvokeResponse.bufferHasIdentifier(bb)) {
    throw new Error("Plugin invoke response buffer identifier mismatch.");
  }
  const unpacked = PluginInvokeResponse.getRootAsPluginInvokeResponse(bb).unpack();
  const arena = Uint8Array.from(unpacked.payloadArena ?? []);
  const outputs = materializeArenaFrames(unpacked.outputFrames ?? [], arena);
  return {
    statusCode: unpacked.statusCode ?? 0,
    yielded: unpacked.yielded === true,
    backlogRemaining: unpacked.backlogRemaining ?? 0,
    outputFrames: outputs,
    outputs,
    payloadArena: arena,
    errorCode: unpacked.errorCode ?? null,
    errorMessage: unpacked.errorMessage ?? null,
  };
}

export function encodePluginInvokeResponse(response = {}) {
  const { frames, arena } = packArenaFrames(
    Array.isArray(response.outputs) ? response.outputs : response.outputFrames ?? [],
    normalizeSdsArenaFrame,
  );
  return encodeRoot(
    (value) =>
      new PIVT(
        null,
        new PIVResponseT(
          Number(value.statusCode ?? 0),
          resolvePivStatus(value),
          value.yielded === true,
          normalizeUnsignedInteger(value.backlogRemaining),
          frames,
          Array.from(arena),
          value.errorCode ?? null,
          value.errorMessage ?? null,
          normalizeBigInt(value.traceId),
        ),
      ),
    PIV.finishPIVBuffer,
    response,
  );
}

export function decodePluginInvokeResponse(data, options = {}) {
  const bb = toByteBuffer(data);
  if (PIV.bufferHasIdentifier(bb)) {
    const unpacked = PIV.getRootAsPIV(bb).unpack();
    if (!unpacked.RESPONSE) {
      throw new Error("SDS PIV invoke envelope does not contain a response.");
    }
    const arena = Uint8Array.from(unpacked.RESPONSE.PAYLOAD_ARENA ?? []);
    const outputs = materializeSdsArenaFrames(
      unpacked.RESPONSE.OUTPUTS ?? [],
      arena,
      options,
    );
    return {
      statusCode: unpacked.RESPONSE.STATUS_CODE ?? 0,
      status: unpacked.RESPONSE.STATUS ?? SdsPivStatus.OK,
      yielded: unpacked.RESPONSE.YIELDED === true,
      backlogRemaining: unpacked.RESPONSE.BACKLOG_REMAINING ?? 0,
      outputFrames: outputs,
      outputs,
      payloadArena: arena,
      errorCode: unpacked.RESPONSE.ERROR_CODE ?? null,
      errorMessage: unpacked.RESPONSE.ERROR_MESSAGE ?? null,
      traceId: unpacked.RESPONSE.TRACE_ID ?? BigInt(0),
      envelope: "PIV",
    };
  }
  return {
    ...decodeLegacyPluginInvokeResponse(bb),
    envelope: "PINS",
  };
}

export function normalizeInvokeSurfaceName(value) {
  if (value === InvokeSurface.COMMAND || value === "command") {
    return "command";
  }
  if (value === InvokeSurface.DIRECT || value === "direct") {
    return "direct";
  }
  return null;
}

export function normalizeInvokeSurfaces(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const surfaces = [];
  for (const entry of value) {
    const normalized = normalizeInvokeSurfaceName(entry);
    if (normalized && !surfaces.includes(normalized)) {
      surfaces.push(normalized);
    }
  }
  return surfaces;
}
