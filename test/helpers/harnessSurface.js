// The ported harness surface, aggregated for the WS12.2 spec ports. Mirrors
// the names orbpro-integration's runtime barrel exported (PMAN codec names
// keep their original spelling here so the specs port verbatim; the public
// SDK exports are the renamed *Pman pair).
export {
  decodeFlowProgram,
  encodeFlowProgram,
  decodeStreamInvokeRequest,
  encodeStreamInvokeRequest,
  decodeStreamInvokeResponse,
  encodeStreamInvokeResponse,
  decodePluginManifestPman as decodePluginManifest,
  encodePluginManifestPman as encodePluginManifest,
} from "../../src/flow/flowCodec.js";
export { FlowRuntime } from "../../src/flow/jsFlowRuntime.js";
export { createDependencyStreamBridge } from "../../src/flow/dependencyStreamBridge.js";
export { MethodRegistry } from "../../src/runtime-host/methodRegistry.js";
export {
  buildLegacySdnCronSpecs,
  buildLegacySdnMetadata,
  buildLegacySdnProtocolSpecs,
  encodeLegacySdnMetadata,
  SdnCompatAdapter,
} from "../../src/compat/sdnLegacy.js";
export { generateLegacySdnShimSource } from "../../src/compiler/sdnShimGenerator.js";
