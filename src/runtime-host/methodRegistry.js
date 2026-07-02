/**
 * Manifest-aware flow-tier method registry (ported from
 * orbpro-integration/sdk/src/runtime/MethodRegistry.js).
 *
 * This wraps the VENDORED sdn-flow MethodRegistry (src/flow/vendor/sdn-flow —
 * behavior-identical to the sdn-flow pin at 4dd28e2; validation semantics like
 * duplicate-plugin rejection, missing-handler errors, required-port presence,
 * min/max stream bounds, acceptedTypeSets matching, and outputStreamCap
 * enforcement are preserved verbatim) and adds manifest coercion: callers may
 * register with a PluginManifestT, PMAN flatbuffer bytes, or a plain object.
 *
 * Distinct from createModuleRegistry (module lifecycle install/load/unload):
 * this is the flow-graph invoke registry the JS FlowRuntime interpreter and
 * the SdnCompatAdapter dispatch through.
 */
import { MethodRegistry as VendoredSdnFlowMethodRegistry } from "../flow/vendor/sdn-flow/index.js";
import { normalizeManifestForSdnFlow } from "../flow/normalize.js";

export class MethodRegistry {
  #registry = new VendoredSdnFlowMethodRegistry();

  registerPlugin({ manifest, handlers = {}, plugin = null }) {
    return this.#registry.registerPlugin({
      manifest: normalizeManifestForSdnFlow(manifest),
      handlers,
      plugin,
    });
  }

  getPlugin(pluginId) {
    return this.#registry.getPlugin(pluginId);
  }

  unregisterPlugin(pluginId) {
    return this.#registry.unregisterPlugin(pluginId);
  }

  getMethod(pluginId, methodId) {
    return this.#registry.getMethod(pluginId, methodId);
  }

  listPlugins() {
    return this.#registry.listPlugins();
  }

  async invoke(options) {
    return this.#registry.invoke(options);
  }

  clear() {
    this.#registry.clear();
  }
}

export default MethodRegistry;
