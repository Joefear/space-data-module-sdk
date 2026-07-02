import { PluginManifestT } from "../generated/orbpro/manifest.js";
import { decodePluginManifestPman } from "../flow/flowCodec.js";
import { buildLegacySdnMetadata } from "../compat/sdnLegacy.js";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function asManifest(manifest) {
  if (manifest instanceof PluginManifestT) {
    return manifest;
  }
  if (
    manifest instanceof Uint8Array ||
    manifest instanceof ArrayBuffer ||
    ArrayBuffer.isView(manifest)
  ) {
    return decodePluginManifestPman(manifest);
  }
  return Object.assign(new PluginManifestT(), manifest);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return textDecoder.decode(value);
  }
  return String(value);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function escapeCStringBytes(value) {
  return Array.from(
    textEncoder.encode(value),
    (byte) => `\\x${byte.toString(16).padStart(2, "0")}`,
  ).join("");
}

function resolveRequestMethodId(manifest, explicitMethodId) {
  const declaredMethodIds = unique(
    asArray(manifest.protocols).map((protocol) => asString(protocol?.methodId)),
  );

  if (explicitMethodId) {
    const normalizedMethodId = asString(explicitMethodId);
    if (
      declaredMethodIds.length > 0 &&
      !declaredMethodIds.includes(normalizedMethodId)
    ) {
      throw new Error(
        `Requested legacy handle_request binding "${normalizedMethodId}" is not declared by the manifest protocols.`,
      );
    }
    return normalizedMethodId;
  }

  if (declaredMethodIds.length <= 1) {
    return declaredMethodIds[0] ?? null;
  }

  throw new Error(
    "Manifest declares multiple protocol methods; requestMethodId is required because legacy plugin_handle_request can only bind one canonical method.",
  );
}

function getMethodTableEntry(methodTable, methodId) {
  if (!methodId) {
    return null;
  }
  if (methodTable instanceof Map) {
    return methodTable.get(methodId) ?? null;
  }
  if (typeof methodTable === "object" && methodTable !== null) {
    return methodTable[methodId] ?? null;
  }
  return null;
}

function collectCronBindings(manifest, methodTable) {
  const methodIds = unique(
    asArray(manifest.timers).map((timer) => asString(timer?.methodId)),
  );

  return methodIds.map((methodId) => {
    const entry = getMethodTableEntry(methodTable, methodId);
    if (!entry?.cronSymbol) {
      throw new Error(
        `Manifest timer method "${methodId}" is missing a cronSymbol in the SDN shim method table.`,
      );
    }
    return {
      methodId,
      cronSymbol: asString(entry.cronSymbol),
    };
  });
}

function renderExternDeclarations(requestBinding, cronBindings) {
  const lines = [];
  if (requestBinding?.requestSymbol) {
    lines.push(
      `extern int32_t ${requestBinding.requestSymbol}(const uint8_t* request_ptr, size_t request_len, const char* host_ptr, uint8_t* output_ptr, size_t output_cap, size_t* output_len_ptr);`,
    );
  }
  for (const binding of cronBindings) {
    lines.push(
      `extern int32_t ${binding.cronSymbol}(const uint8_t* input_ptr, size_t input_len, uint8_t* output_ptr, size_t output_cap, size_t* output_len_ptr);`,
    );
  }
  return unique(lines).join("\n");
}

function renderCronDispatch(cronBindings) {
  if (cronBindings.length === 0) {
    return `    (void)input_ptr;
    (void)input_len;
    (void)output_ptr;
    (void)output_cap;
    return ORBPRO_SDN_ERR_UNKNOWN_METHOD;`;
  }

  return cronBindings
    .map(
      (
        binding,
        index,
      ) => `${index === 0 ? "    if" : "    else if"} (orbpro_sdn_method_equals(method_ptr, method_len, "${binding.methodId}")) {
        size_t output_len = 0;
        const int32_t status = ${binding.cronSymbol}(
            input_ptr,
            input_len,
            output_ptr,
            output_cap,
            &output_len);
        if (status != 0) {
            return status;
        }
        if (output_len > output_cap) {
            return ORBPRO_SDN_ERR_OUTPUT_TOO_LARGE;
        }
        return (int32_t)output_len;
    }`,
    )
    .concat("    return ORBPRO_SDN_ERR_UNKNOWN_METHOD;")
    .join("\n");
}

export function generateLegacySdnShimSource(options = {}) {
  const {
    manifest,
    methodTable = {},
    requestMethodId = undefined,
    metadataOptions = {},
  } = options;

  const normalizedManifest = asManifest(manifest);
  const pluginId = asString(normalizedManifest.pluginId);
  if (!pluginId) {
    throw new Error(
      "Cannot generate SDN shims for a manifest without pluginId.",
    );
  }

  const resolvedRequestMethodId = resolveRequestMethodId(
    normalizedManifest,
    requestMethodId,
  );
  const requestBinding = resolvedRequestMethodId
    ? {
        methodId: resolvedRequestMethodId,
        requestSymbol: asString(
          getMethodTableEntry(methodTable, resolvedRequestMethodId)
            ?.requestSymbol,
        ),
      }
    : null;

  if (
    resolvedRequestMethodId &&
    (!requestBinding?.requestSymbol ||
      requestBinding.requestSymbol.length === 0)
  ) {
    throw new Error(
      `Manifest request method "${resolvedRequestMethodId}" is missing a requestSymbol in the SDN shim method table.`,
    );
  }

  const cronBindings = collectCronBindings(normalizedManifest, methodTable);
  const externDeclarations = renderExternDeclarations(
    requestBinding,
    cronBindings,
  );
  const metadataJson = JSON.stringify(
    buildLegacySdnMetadata(normalizedManifest, metadataOptions),
  );
  const metadataLiteral = escapeCStringBytes(metadataJson);
  const protocolComments = asArray(normalizedManifest.protocols)
    .map((protocol) => {
      const protocolId = asString(protocol?.protocolId) ?? "<unnamed>";
      const methodId = asString(protocol?.methodId) ?? "<unset>";
      return ` *   ${protocolId} -> ${methodId}`;
    })
    .join("\n");
  const timerComments = asArray(normalizedManifest.timers)
    .map((timer) => {
      const timerId = asString(timer?.timerId) ?? "<unnamed>";
      const methodId = asString(timer?.methodId) ?? "<unset>";
      return ` *   ${timerId} -> ${methodId}`;
    })
    .join("\n");

  return `/**
 * SDN compatibility shims for ${pluginId}
 *
 * Generated by @orbpro/integration-sdk from the canonical OrbPro manifest.
 * These exports are legacy host adapters, not the canonical plugin ABI.
 *
 * Legacy plugin_handle_request binding:
 *   ${resolvedRequestMethodId ?? "<stubbed>"}
 *
 * Declared protocol routes:
${protocolComments || " *   <none>"}
 *
 * Declared cron routes:
${timerComments || " *   <none>"}
 */

#include <stddef.h>
#include <stdint.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#define ORBPRO_SDN_ERR_BAD_ARG (-1)
#define ORBPRO_SDN_ERR_METADATA_BUFFER_TOO_SMALL (-2)
#define ORBPRO_SDN_ERR_UNKNOWN_METHOD (-3)
#define ORBPRO_SDN_ERR_REQUEST_UNAVAILABLE (-4)
#define ORBPRO_SDN_ERR_OUTPUT_TOO_LARGE (-5)

${externDeclarations || "/* No external handler declarations were required. */"}

static const char ORBPRO_SDN_METADATA_JSON[] = "${metadataLiteral}";
static const size_t ORBPRO_SDN_METADATA_JSON_LEN = sizeof(ORBPRO_SDN_METADATA_JSON) - 1;

static int orbpro_sdn_method_equals(const char* method_ptr, size_t method_len, const char* expected) {
    const size_t expected_len = strlen(expected);
    return method_ptr != NULL &&
        expected_len == method_len &&
        memcmp(method_ptr, expected, method_len) == 0;
}

EMSCRIPTEN_KEEPALIVE
int32_t plugin_get_metadata(uint8_t* output, size_t output_size) {
    if (output == NULL) {
        return ORBPRO_SDN_ERR_BAD_ARG;
    }
    if (output_size < ORBPRO_SDN_METADATA_JSON_LEN) {
        return ORBPRO_SDN_ERR_METADATA_BUFFER_TOO_SMALL;
    }
    memcpy(output, ORBPRO_SDN_METADATA_JSON, ORBPRO_SDN_METADATA_JSON_LEN);
    return (int32_t)ORBPRO_SDN_METADATA_JSON_LEN;
}

EMSCRIPTEN_KEEPALIVE
int32_t plugin_handle_request(
    const uint8_t* request_ptr,
    size_t request_len,
    const char* host_ptr,
    uint8_t* output_ptr,
    size_t output_cap,
    size_t* output_len_ptr) {
    if (output_len_ptr == NULL) {
        return ORBPRO_SDN_ERR_BAD_ARG;
    }
    *output_len_ptr = 0;
${
  requestBinding?.requestSymbol
    ? `    return ${requestBinding.requestSymbol}(
        request_ptr,
        request_len,
        host_ptr,
        output_ptr,
        output_cap,
        output_len_ptr);`
    : `    (void)request_ptr;
    (void)request_len;
    (void)host_ptr;
    (void)output_ptr;
    (void)output_cap;
    return ORBPRO_SDN_ERR_REQUEST_UNAVAILABLE;`
}
}

EMSCRIPTEN_KEEPALIVE
int32_t plugin_cron(
    const char* method_ptr,
    size_t method_len,
    const uint8_t* input_ptr,
    size_t input_len,
    uint8_t* output_ptr,
    size_t output_cap) {
    if (method_ptr == NULL) {
        return ORBPRO_SDN_ERR_BAD_ARG;
    }
${renderCronDispatch(cronBindings)}
}
`;
}
