import * as flatbuffers from "../vendor/flatbuffers/flatbuffers.js";

import { PluginInvokeRequest } from "../generated/orbpro/invoke/plugin-invoke-request.js";
import { PluginInvokeResponse } from "../generated/orbpro/invoke/plugin-invoke-response.js";
import { InvokeSurface } from "../generated/orbpro/manifest/invoke-surface.js";
import { BufferMutability } from "../generated/orbpro/stream/buffer-mutability.js";
import { BufferOwnership } from "../generated/orbpro/stream/buffer-ownership.js";
import { FlatBufferTypeRefT } from "../generated/orbpro/stream/flat-buffer-type-ref.js";
import { PayloadWireFormat } from "../generated/orbpro/stream/payload-wire-format.js";
import { TypedArenaBufferT } from "../generated/orbpro/stream/typed-arena-buffer.js";
import { toUint8Array } from "../runtime/bufferLike.js";

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
  if (value === 1 || value === "aligned-binary") {
    return "aligned-binary";
  }
  return "flatbuffer";
}

function payloadWireFormatName(value) {
  return value === PayloadWireFormat.ALIGNED_BINARY
    ? "aligned-binary"
    : "flatbuffer";
}

function toFlatBufferTypeRefT(value = {}, payloadLength = 0) {
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

function alignOffset(offset, alignment) {
  if (alignment <= 1) {
    return offset;
  }
  const remainder = offset % alignment;
  return remainder === 0 ? offset : offset + alignment - remainder;
}

/**
 * Alignment guaranteed for the payload arena base of every encoded
 * PluginInvokeRequest/PluginInvokeResponse, measured as an absolute byte
 * address (ArrayBuffer offset 0 / wasm linear memory address 0). Frame
 * offsets inside the arena are packed to at least their declared alignment,
 * so an 8-aligned arena base makes every frame's absolute address satisfy
 * `requiredAlignment` up to 8 without copying.
 */
export const INVOKE_ARENA_ALIGNMENT = 8;

/**
 * Create a ubyte vector whose data is aligned to `alignment` bytes relative
 * to the finished buffer. The stock generated `createPayloadArenaVector`
 * only guarantees 1-byte alignment (and writes byte-at-a-time); this helper
 * forces the arena base onto an 8-byte boundary and bulk-copies the bytes.
 */
function createAlignedByteVector(builder, bytes, alignment) {
  builder.startVector(1, bytes.length, alignment);
  builder.bb.setPosition((builder.space -= bytes.length));
  builder.bb.bytes().set(bytes, builder.space);
  return builder.endVector();
}

function describeInvokeBufferKind(kind) {
  return kind === "request" ? "PluginInvokeRequest" : "PluginInvokeResponse";
}

/**
 * Assert the invariants item-1 of the comms remediation guarantees:
 * the encoded buffer base and the payload arena base are both 8-byte
 * aligned as absolute addresses. Throws on violation — there is no
 * realignment fallback.
 */
export function assertAlignedInvokeBuffer(
  bytes,
  arenaArray,
  kind,
  arenaAlignment = INVOKE_ARENA_ALIGNMENT,
) {
  if (bytes.byteOffset % INVOKE_ARENA_ALIGNMENT !== 0) {
    throw new Error(
      `${describeInvokeBufferKind(kind)} buffer base is not ${INVOKE_ARENA_ALIGNMENT}-byte aligned (byteOffset ${bytes.byteOffset}).`,
    );
  }
  if (
    arenaArray &&
    arenaArray.length > 0 &&
    arenaArray.byteOffset % arenaAlignment !== 0
  ) {
    throw new Error(
      `${describeInvokeBufferKind(kind)} payload arena base is not ${arenaAlignment}-byte aligned (byteOffset ${arenaArray.byteOffset}).`,
    );
  }
}

function normalizeArenaFrame(frame = {}, offset) {
  const payload = toUint8Array(frame.payload ?? new Uint8Array()) ?? new Uint8Array();
  const typeRef = toFlatBufferTypeRefT(frame.typeRef ?? frame.allowedType ?? {}, payload.length);
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

function packArenaFrames(frames = []) {
  const packedFrames = [];
  const normalizedFrames = [];
  let offset = 0;
  let arenaAlignment = INVOKE_ARENA_ALIGNMENT;
  for (const frame of frames) {
    const normalized = normalizeArenaFrame(frame, offset);
    offset = normalized.buffer.offset + normalized.buffer.size;
    if (normalized.buffer.alignment > arenaAlignment) {
      arenaAlignment = normalized.buffer.alignment;
    }
    packedFrames.push(normalized.buffer);
    normalizedFrames.push(normalized);
  }

  const arena = new Uint8Array(offset);
  for (const normalized of normalizedFrames) {
    arena.set(normalized.payload, normalized.buffer.offset);
  }
  return {
    frames: packedFrames,
    arena,
    arenaAlignment,
  };
}

function materializeArenaFrames(frames = [], arenaBytes) {
  return frames.map((frame) => {
    const offset = normalizeUnsignedInteger(frame.offset);
    const size = normalizeUnsignedInteger(frame.size);
    const requiredAlignment = normalizeUnsignedInteger(
      frame.typeRef?.requiredAlignment,
    );
    if (requiredAlignment > 1 && size > 0) {
      const absoluteOffset = arenaBytes.byteOffset + offset;
      if (absoluteOffset % requiredAlignment !== 0) {
        throw new Error(
          `Arena frame "${frame.portId ?? ""}" payload is misaligned: absolute offset ${absoluteOffset} violates requiredAlignment ${requiredAlignment}.`,
        );
      }
    }
    const payload = arenaBytes.subarray(offset, offset + size);
    return {
      ...frame,
      payload,
      typeRef: frame.typeRef ?? null,
    };
  });
}

function decodeFlatBufferTypeRef(typeRef) {
  if (!typeRef) {
    return null;
  }
  return {
    schemaName: typeRef.schemaName(),
    fileIdentifier: typeRef.fileIdentifier(),
    schemaHash: Array.from(typeRef.schemaHashArray() ?? []),
    acceptsAnyFlatbuffer: typeRef.acceptsAnyFlatbuffer(),
    wireFormat: payloadWireFormatName(typeRef.wireFormat()),
    rootTypeName: typeRef.rootTypeName(),
    fixedStringLength: typeRef.fixedStringLength(),
    byteLength: typeRef.byteLength(),
    requiredAlignment: typeRef.requiredAlignment(),
  };
}

function decodeTypedArenaBuffer(frame) {
  if (!frame) {
    return null;
  }
  return {
    typeRef: decodeFlatBufferTypeRef(frame.typeRef()),
    portId: frame.portId(),
    alignment: frame.alignment(),
    offset: frame.offset(),
    size: frame.size(),
    ownership: frame.ownership(),
    generation: frame.generation(),
    mutability: frame.mutability(),
    traceId: frame.traceId(),
    streamId: frame.streamId(),
    sequence: frame.sequence(),
    endOfStream: frame.endOfStream(),
  };
}

function decodeArenaFrames(length, accessor) {
  const frames = [];
  for (let index = 0; index < length; index++) {
    const frame = decodeTypedArenaBuffer(accessor(index));
    if (frame) {
      frames.push(frame);
    }
  }
  return frames;
}

function packFrameOffsets(builder, frames) {
  return frames.map((frame) => frame.pack(builder));
}

export function encodePluginInvokeRequest(request = {}) {
  const { frames, arena, arenaAlignment } = packArenaFrames(
    Array.isArray(request.inputs) ? request.inputs : request.inputFrames ?? [],
  );
  const builder = new flatbuffers.Builder(1024);
  const methodIdOffset =
    request.methodId !== null && request.methodId !== undefined
      ? builder.createString(String(request.methodId))
      : 0;
  const framesVector = PluginInvokeRequest.createInputFramesVector(
    builder,
    packFrameOffsets(builder, frames),
  );
  const arenaVector = createAlignedByteVector(builder, arena, arenaAlignment);
  PluginInvokeRequest.startPluginInvokeRequest(builder);
  PluginInvokeRequest.addMethodId(builder, methodIdOffset);
  PluginInvokeRequest.addInputFrames(builder, framesVector);
  PluginInvokeRequest.addPayloadArena(builder, arenaVector);
  PluginInvokeRequest.finishPluginInvokeRequestBuffer(
    builder,
    PluginInvokeRequest.endPluginInvokeRequest(builder),
  );
  const bytes = builder.asUint8Array();
  const root = PluginInvokeRequest.getRootAsPluginInvokeRequest(
    new flatbuffers.ByteBuffer(bytes),
  );
  assertAlignedInvokeBuffer(bytes, root.payloadArenaArray(), "request", arenaAlignment);
  return bytes;
}

export function decodePluginInvokeRequest(data) {
  const bb = toByteBuffer(data);
  if (!PluginInvokeRequest.bufferHasIdentifier(bb)) {
    throw new Error("Plugin invoke request buffer identifier mismatch.");
  }
  const root = PluginInvokeRequest.getRootAsPluginInvokeRequest(bb);
  const arena = root.payloadArenaArray() ?? new Uint8Array();
  const inputFrames = decodeArenaFrames(root.inputFramesLength(), (index) =>
    root.inputFrames(index),
  );
  const inputs = materializeArenaFrames(inputFrames, arena);
  return {
    methodId: root.methodId() ?? null,
    inputFrames: inputs,
    inputs,
    payloadArena: arena,
  };
}

export function encodePluginInvokeResponse(response = {}) {
  const { frames, arena, arenaAlignment } = packArenaFrames(
    Array.isArray(response.outputs) ? response.outputs : response.outputFrames ?? [],
  );
  const builder = new flatbuffers.Builder(1024);
  const errorCodeOffset =
    response.errorCode !== null && response.errorCode !== undefined
      ? builder.createString(String(response.errorCode))
      : 0;
  const errorMessageOffset =
    response.errorMessage !== null && response.errorMessage !== undefined
      ? builder.createString(String(response.errorMessage))
      : 0;
  const framesVector = PluginInvokeResponse.createOutputFramesVector(
    builder,
    packFrameOffsets(builder, frames),
  );
  const arenaVector = createAlignedByteVector(builder, arena, arenaAlignment);
  PluginInvokeResponse.startPluginInvokeResponse(builder);
  PluginInvokeResponse.addStatusCode(builder, Number(response.statusCode ?? 0));
  PluginInvokeResponse.addYielded(builder, response.yielded === true);
  PluginInvokeResponse.addBacklogRemaining(
    builder,
    normalizeUnsignedInteger(response.backlogRemaining),
  );
  PluginInvokeResponse.addOutputFrames(builder, framesVector);
  PluginInvokeResponse.addPayloadArena(builder, arenaVector);
  PluginInvokeResponse.addErrorCode(builder, errorCodeOffset);
  PluginInvokeResponse.addErrorMessage(builder, errorMessageOffset);
  PluginInvokeResponse.finishPluginInvokeResponseBuffer(
    builder,
    PluginInvokeResponse.endPluginInvokeResponse(builder),
  );
  const bytes = builder.asUint8Array();
  const root = PluginInvokeResponse.getRootAsPluginInvokeResponse(
    new flatbuffers.ByteBuffer(bytes),
  );
  assertAlignedInvokeBuffer(bytes, root.payloadArenaArray(), "response", arenaAlignment);
  return bytes;
}

export function decodePluginInvokeResponse(data) {
  const bb = toByteBuffer(data);
  if (!PluginInvokeResponse.bufferHasIdentifier(bb)) {
    throw new Error("Plugin invoke response buffer identifier mismatch.");
  }
  const root = PluginInvokeResponse.getRootAsPluginInvokeResponse(bb);
  const arena = root.payloadArenaArray() ?? new Uint8Array();
  const outputFrames = decodeArenaFrames(root.outputFramesLength(), (index) =>
    root.outputFrames(index),
  );
  const outputs = materializeArenaFrames(outputFrames, arena);
  return {
    statusCode: root.statusCode() ?? 0,
    yielded: root.yielded() === true,
    backlogRemaining: root.backlogRemaining() ?? 0,
    outputFrames: outputs,
    outputs,
    payloadArena: arena,
    errorCode: root.errorCode() ?? null,
    errorMessage: root.errorMessage() ?? null,
  };
}

/**
 * Forward a decoded output frame of one module invocation directly as an
 * input frame for the next invocation — the zero-copy module-to-module hop.
 *
 * The returned descriptor references the SAME payload bytes (a view into the
 * producer's response arena); no JSON/FlatBuffer decode or re-serialization
 * happens on the hop. `encodePluginInvokeRequest` copies those bytes exactly
 * once into the consumer's request arena (the unavoidable transfer into the
 * next module's linear memory), preserving them byte-for-byte.
 *
 * @param {Object} outputFrame - a frame from decodePluginInvokeResponse().outputs
 * @param {Object} [overrides] - per-hop overrides; `portId` is required when
 *   the consumer's input port differs from the producer's output port.
 * @returns {Object} input frame descriptor for encodePluginInvokeRequest
 */
export function forwardOutputFrameAsInput(outputFrame, overrides = {}) {
  if (!outputFrame || typeof outputFrame !== "object") {
    throw new TypeError(
      "forwardOutputFrameAsInput requires a decoded output frame.",
    );
  }
  const payload = toUint8Array(outputFrame.payload);
  if (!payload) {
    throw new TypeError(
      "forwardOutputFrameAsInput requires an output frame with payload bytes.",
    );
  }
  const portId = overrides.portId ?? outputFrame.portId ?? null;
  if (!portId) {
    throw new TypeError(
      "forwardOutputFrameAsInput requires a portId (from the frame or overrides).",
    );
  }
  return {
    portId,
    payload,
    typeRef: overrides.typeRef ?? outputFrame.typeRef ?? null,
    alignment:
      overrides.alignment ??
      (outputFrame.alignment > 0 ? outputFrame.alignment : undefined),
    generation: overrides.generation ?? outputFrame.generation,
    traceId: overrides.traceId ?? outputFrame.traceId,
    streamId: overrides.streamId ?? outputFrame.streamId,
    sequence: overrides.sequence ?? outputFrame.sequence,
    endOfStream:
      overrides.endOfStream ?? (outputFrame.endOfStream === true || undefined),
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
