import { DrainPolicy } from "../generated/orbpro/manifest.js";
import {
  FlatBufferTypeRefT,
  PayloadWireFormat,
  TypedArenaBufferT,
  BufferMutability,
  BufferOwnership,
} from "../generated/orbpro/stream.js";
import {
  decodeStreamInvokeResponse,
  encodeStreamInvokeRequest,
} from "./flowCodec.js";
import { hasByteAddressableBuffer, toUint8Array } from "../runtime/bufferLike.js";

function writeBytes(memory, pointer, data) {
  const bytes = new Uint8Array(memory.buffer);
  bytes.set(toUint8Array(data) ?? new Uint8Array(), Number(pointer) >>> 0);
}

function cloneBytes(memory, offset, size) {
  const base = Number(offset) >>> 0;
  const length = Number(size) >>> 0;
  if (length === 0) {
    return new Uint8Array();
  }
  return new Uint8Array(new Uint8Array(memory.buffer, base, length));
}

function normalizeBigInt(value, fallback = 0n) {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  return fallback;
}

function normalizeTypeRef(typeRef = null) {
  if (!typeRef) {
    return null;
  }
  if (typeRef instanceof FlatBufferTypeRefT) {
    return typeRef;
  }
  return new FlatBufferTypeRefT(
    typeRef.schemaName ?? typeRef.schema_name ?? null,
    typeRef.fileIdentifier ?? typeRef.file_identifier ?? null,
    ArrayBuffer.isView(typeRef.schemaHash ?? typeRef.schema_hash)
      ? Array.from(typeRef.schemaHash ?? typeRef.schema_hash)
      : Array.isArray(typeRef.schemaHash ?? typeRef.schema_hash)
        ? [...(typeRef.schemaHash ?? typeRef.schema_hash)]
        : [],
    Boolean(
      typeRef.acceptsAnyFlatbuffer ?? typeRef.accepts_any_flatbuffer ?? false,
    ),
    typeRef.wireFormat ?? typeRef.wire_format ?? PayloadWireFormat.Flatbuffer,
    typeRef.rootTypeName ?? typeRef.root_type_name ?? null,
    Number(typeRef.fixedStringLength ?? typeRef.fixed_string_length ?? 0),
    Number(typeRef.byteLength ?? typeRef.byte_length ?? 0),
    Number(typeRef.requiredAlignment ?? typeRef.required_alignment ?? 0),
  );
}

function getDependencyMemory(instantiatedDependency) {
  const memory =
    instantiatedDependency?.memory ??
    instantiatedDependency?.exports?.memory ??
    null;
  if (!memory || !hasByteAddressableBuffer(memory)) {
    throw new Error(
      "Dependency stream bridge requires dependency WebAssembly.Memory.",
    );
  }
  return memory;
}

function getDependencyAllocator(instantiatedDependency) {
  const malloc =
    instantiatedDependency?.resolvedExports?.malloc ??
    instantiatedDependency?.exports?.malloc ??
    null;
  const free =
    instantiatedDependency?.resolvedExports?.free ??
    instantiatedDependency?.exports?.free ??
    null;
  if (typeof malloc !== "function" || typeof free !== "function") {
    throw new Error(
      "Dependency stream bridge requires dependency malloc/free exports.",
    );
  }
  return { malloc, free };
}

function getDependencyRawInvoker(instantiatedDependency) {
  const invokeRawStream = instantiatedDependency?.invokeRawStream ?? null;
  if (typeof invokeRawStream !== "function") {
    throw new Error(
      "Dependency stream bridge requires instantiatedDependency.invokeRawStream().",
    );
  }
  return invokeRawStream;
}

function stageInputFrames(instantiatedDependency, inputs = []) {
  const memory = getDependencyMemory(instantiatedDependency);
  const { malloc, free } = getDependencyAllocator(instantiatedDependency);
  const stagedPointers = [];
  const typedInputs = inputs.map((input = {}) => {
    const payload = toUint8Array(
      input.bytes ?? input.data ?? input.payloadBytes ?? new Uint8Array(),
    );
    const pointer =
      payload.length > 0 ? Number(malloc(payload.length)) >>> 0 : 0;
    if (pointer !== 0) {
      writeBytes(memory, pointer, payload);
      stagedPointers.push(pointer);
    }
    return new TypedArenaBufferT(
      normalizeTypeRef(input.typeRef ?? input.type_ref ?? null),
      input.portId ?? input.port_id ?? null,
      Number(input.alignment ?? 8) >>> 0,
      pointer,
      payload.length >>> 0,
      BufferOwnership.BORROWED,
      Number(input.generation ?? 0) >>> 0,
      BufferMutability.IMMUTABLE,
      normalizeBigInt(input.traceToken ?? input.trace_token ?? 0),
      Number(input.streamId ?? input.stream_id ?? 0) >>> 0,
      normalizeBigInt(input.sequence ?? 0),
      Boolean(input.endOfStream ?? input.end_of_stream ?? false),
    );
  });
  return {
    typedInputs,
    release() {
      for (const pointer of stagedPointers) {
        free(pointer);
      }
    },
  };
}

function normalizeOutputFrame(instantiatedDependency, output = {}) {
  const memory = getDependencyMemory(instantiatedDependency);
  const bytes =
    typeof instantiatedDependency?.cloneBytes === "function"
      ? instantiatedDependency.cloneBytes(output.offset, output.size)
      : cloneBytes(memory, output.offset, output.size);
  return {
    typeRef: output.typeRef ?? null,
    portId: output.portId ?? null,
    alignment: output.alignment ?? 8,
    offset: output.offset ?? 0,
    size: output.size ?? bytes.length,
    ownership: output.ownership,
    generation: output.generation ?? 0,
    mutability: output.mutability,
    traceToken: Number(output.traceId ?? 0n),
    streamId: output.streamId ?? 0,
    sequence: Number(output.sequence ?? 0n),
    endOfStream: output.endOfStream ?? false,
    bytes,
  };
}

function releaseOutputFrames(instantiatedDependency, outputs = []) {
  const release =
    instantiatedDependency?.release ??
    instantiatedDependency?.resolvedExports?.free ??
    null;
  if (typeof release !== "function") {
    return;
  }
  const released = new Set();
  for (const output of outputs) {
    const pointer = Number(output.offset ?? 0) >>> 0;
    if (pointer === 0 || released.has(pointer)) {
      continue;
    }
    release(pointer);
    released.add(pointer);
  }
}

export function createDependencyStreamBridge(options = {}) {
  const drainPolicy = options.drainPolicy ?? DrainPolicy.DRAIN_UNTIL_YIELD;
  const releaseOutputs = options.releaseOutputs !== false;

  return function dependencyStreamBridge({
    methodId,
    inputs = [],
    outputStreamCap = 0,
    instantiatedDependency,
  } = {}) {
    const invokeRawStream = getDependencyRawInvoker(instantiatedDependency);
    const stagedInputs = stageInputFrames(instantiatedDependency, inputs);
    try {
      const requestBytes = encodeStreamInvokeRequest({
        methodId,
        inputs: stagedInputs.typedInputs,
        outputStreamCap,
        drainPolicy,
      });
      const responseBytes = invokeRawStream(requestBytes);
      if (!responseBytes || responseBytes.length === 0) {
        return {
          statusCode: 0,
          backlogRemaining: 0,
          yielded: false,
          outputs: [],
        };
      }
      const response = decodeStreamInvokeResponse(responseBytes);
      const outputs = response.outputs.map((output) =>
        normalizeOutputFrame(instantiatedDependency, output),
      );
      if (releaseOutputs) {
        releaseOutputFrames(instantiatedDependency, response.outputs);
      }
      return {
        statusCode: response.errorCode ?? 0,
        backlogRemaining: response.backlogRemaining ?? 0,
        yielded: response.yielded ?? false,
        outputs,
        errorMessage: response.errorMessage ?? null,
      };
    } finally {
      stagedInputs.release();
    }
  };
}

export default createDependencyStreamBridge;
