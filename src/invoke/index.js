export {
  PluginInvokeRequest as LegacyPluginInvokeRequest,
  PluginInvokeRequestT as LegacyPluginInvokeRequestT,
  PluginInvokeResponse as LegacyPluginInvokeResponse,
  PluginInvokeResponseT as LegacyPluginInvokeResponseT,
} from "../generated/orbpro/invoke.js";
export {
  decodePluginInvokeRequest,
  decodePluginInvokeResponse,
  decodeLegacyPluginInvokeRequest,
  decodeLegacyPluginInvokeResponse,
  encodePluginInvokeRequest,
  encodePluginInvokeResponse,
  encodeLegacyPluginInvokeRequest,
  encodeLegacyPluginInvokeResponse,
  normalizeInvokeSurfaceName,
  normalizeInvokeSurfaces,
} from "./codec.js";
