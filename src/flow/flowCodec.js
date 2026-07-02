/**
 * Flow-tier codecs (ported from orbpro-integration/sdk/src/runtime/codec.js):
 * the `"FLOW"`-identified FlowProgram buffer, the identifier-less
 * StreamInvokeRequest/Response envelope (the flow dependency `invokeRawStream`
 * guest ABI), and the `"PMAN"`-identified PluginManifest buffer.
 *
 * NOTE the two-manifest split: the SDK's canonical `encodePluginManifest` /
 * `decodePluginManifest` (./manifest) are **$PLG**-flavored. The PMAN pair
 * here ships under the renamed exports `encodePluginManifestPman` /
 * `decodePluginManifestPman` — different wire format, both must exist, and
 * their bytes are frozen contracts. Likewise StreamInvoke* here is a distinct
 * envelope from PluginInvokeRequest/Response (src/invoke/codec.js).
 */
import * as flatbuffers from "flatbuffers";
import { FlowProgram, FlowProgramT } from "../generated/orbpro/flow.js";
import {
  PluginManifest,
  PluginManifestT,
} from "../generated/orbpro/manifest.js";
import {
  StreamInvokeRequest,
  StreamInvokeRequestT,
  StreamInvokeResponseT,
  StreamInvokeResponse,
} from "../generated/orbpro/plugin.js";
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

export function decodePluginManifestPman(data) {
  const bb = toByteBuffer(data);
  if (!PluginManifest.bufferHasIdentifier(bb)) {
    throw new Error("Plugin manifest buffer identifier mismatch.");
  }
  return PluginManifest.getRootAsPluginManifest(bb).unpack();
}

export function encodePluginManifestPman(manifest) {
  const value =
    manifest instanceof PluginManifestT
      ? manifest
      : Object.assign(new PluginManifestT(), manifest);
  const builder = new flatbuffers.Builder(1024);
  PluginManifest.finishPluginManifestBuffer(builder, value.pack(builder));
  return builder.asUint8Array();
}

export function decodeFlowProgram(data) {
  const bb = toByteBuffer(data);
  if (!FlowProgram.bufferHasIdentifier(bb)) {
    throw new Error("Flow program buffer identifier mismatch.");
  }
  return FlowProgram.getRootAsFlowProgram(bb).unpack();
}

export function encodeFlowProgram(program) {
  const value =
    program instanceof FlowProgramT
      ? program
      : Object.assign(new FlowProgramT(), program);
  const builder = new flatbuffers.Builder(1024);
  FlowProgram.finishFlowProgramBuffer(builder, value.pack(builder));
  return builder.asUint8Array();
}

export function decodeStreamInvokeRequest(data) {
  return StreamInvokeRequest.getRootAsStreamInvokeRequest(
    toByteBuffer(data),
  ).unpack();
}

export function encodeStreamInvokeRequest(request) {
  const normalized =
    request instanceof StreamInvokeRequestT
      ? request
      : Object.assign(new StreamInvokeRequestT(), request);
  const builder = new flatbuffers.Builder(1024);
  builder.finish(normalized.pack(builder));
  return builder.asUint8Array();
}

export function encodeStreamInvokeResponse(response) {
  const normalized =
    response instanceof StreamInvokeResponseT
      ? response
      : Object.assign(new StreamInvokeResponseT(), response);
  const builder = new flatbuffers.Builder(1024);
  builder.finish(normalized.pack(builder));
  return builder.asUint8Array();
}

export function decodeStreamInvokeResponse(data) {
  return StreamInvokeResponse.getRootAsStreamInvokeResponse(
    toByteBuffer(data),
  ).unpack();
}
