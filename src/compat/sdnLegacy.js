import {
  CapabilityKind,
  DrainPolicy,
  PluginFamily,
  PluginManifestT,
} from "../generated/orbpro/manifest.js";
import { PayloadWireFormat } from "../generated/orbpro/stream.js";
import { decodePluginManifestPman } from "../flow/flowCodec.js";

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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function enumName(enumType, value, fallback = "UNKNOWN") {
  if (typeof value === "number" && enumType[value]) {
    return enumType[value];
  }
  if (typeof value === "string" && value.trim() !== "") {
    const direct = value.trim();
    if (enumType[direct] !== undefined) {
      return direct;
    }
    const upperSnake = direct.toUpperCase().replace(/-/g, "_");
    if (enumType[upperSnake] !== undefined) {
      return upperSnake;
    }
  }
  return fallback;
}

function formatSchemaHash(schemaHash) {
  const values = ArrayBuffer.isView(schemaHash)
    ? Array.from(schemaHash)
    : Array.isArray(schemaHash)
      ? schemaHash
      : null;
  if (!values || values.length === 0) {
    return null;
  }
  return values
    .map((value) => Number(value).toString(16).padStart(2, "0"))
    .join("");
}

function normalizeWireFormatName(value) {
  if (
    value === PayloadWireFormat.AlignedBinary ||
    String(value ?? "")
      .trim()
      .toLowerCase() === "alignedbinary" ||
    String(value ?? "")
      .trim()
      .toLowerCase() === "aligned-binary"
  ) {
    return "aligned-binary";
  }
  return "flatbuffer";
}

function serializeTypeRef(typeRef) {
  if (!typeRef) {
    return null;
  }
  return {
    schema_name: asString(typeRef.schemaName),
    file_identifier: asString(typeRef.fileIdentifier),
    schema_hash: formatSchemaHash(typeRef.schemaHash),
    accepts_any_flatbuffer: typeRef.acceptsAnyFlatbuffer === true,
    wire_format: normalizeWireFormatName(typeRef.wireFormat),
    root_type_name: asString(typeRef.rootTypeName),
    fixed_string_length: Number(typeRef.fixedStringLength ?? 0),
    byte_length: Number(typeRef.byteLength ?? 0),
    required_alignment: Number(typeRef.requiredAlignment ?? 0),
  };
}

function serializeAcceptedTypeSet(typeSet) {
  return {
    set_id: asString(typeSet?.setId),
    description: asString(typeSet?.description),
    allowed_types: asArray(typeSet?.allowedTypes)
      .map(serializeTypeRef)
      .filter(Boolean),
  };
}

function serializePort(port) {
  return {
    port_id: asString(port?.portId),
    display_name: asString(port?.displayName),
    min_streams: Number(port?.minStreams ?? 1),
    max_streams: Number(port?.maxStreams ?? 1),
    required: port?.required !== false,
    description: asString(port?.description),
    accepted_type_sets: asArray(port?.acceptedTypeSets)
      .map(serializeAcceptedTypeSet)
      .filter(Boolean),
  };
}

function serializeMethod(method) {
  return {
    method: asString(method?.methodId),
    display_name: asString(method?.displayName),
    max_batch: Number(method?.maxBatch ?? 1),
    drain_policy: enumName(
      DrainPolicy,
      method?.drainPolicy ?? DrainPolicy.DRAIN_UNTIL_YIELD,
      "DRAIN_UNTIL_YIELD",
    ),
    description: asString(method?.description),
    input_ports: asArray(method?.inputPorts).map(serializePort),
    output_ports: asArray(method?.outputPorts).map(serializePort),
  };
}

function serializeCapability(capability) {
  return {
    capability: enumName(
      CapabilityKind,
      capability?.capability ?? CapabilityKind.CLOCK,
      "CLOCK",
    ),
    scope: asString(capability?.scope),
    required: capability?.required !== false,
    description: asString(capability?.description),
  };
}

function serializeBuildArtifact(artifact) {
  return {
    artifact_id: asString(artifact?.artifactId),
    kind: asString(artifact?.kind),
    path: asString(artifact?.path),
    target: asString(artifact?.target),
    entry_symbol: asString(artifact?.entrySymbol),
  };
}

function getMethod(manifest, methodId) {
  const normalizedMethodId = asString(methodId);
  return (
    asArray(manifest.methods).find(
      (method) => asString(method?.methodId) === normalizedMethodId,
    ) ?? null
  );
}

function resolvePort(ports, requestedPortId) {
  const normalizedPorts = asArray(ports);
  const normalizedRequestedPortId = asString(requestedPortId);
  if (normalizedRequestedPortId) {
    return (
      normalizedPorts.find(
        (port) => asString(port?.portId) === normalizedRequestedPortId,
      ) ?? null
    );
  }
  if (normalizedPorts.length === 1) {
    return normalizedPorts[0];
  }
  return null;
}

function inferWireKind(port, ports) {
  const candidatePort =
    port ?? (asArray(ports).length === 1 ? asArray(ports)[0] : null);
  if (candidatePort) {
    const firstTypeSet = asArray(candidatePort.acceptedTypeSets)[0];
    const firstType = asArray(firstTypeSet?.allowedTypes)[0];
    return normalizeWireFormatName(firstType?.wireFormat);
  }
  return asArray(ports).length > 0 ? "flatbuffer" : "none";
}

function toFrameList(frames) {
  if (frames === null || frames === undefined) {
    return [];
  }
  return Array.isArray(frames) ? frames : [frames];
}

function applyDefaultPortId(frames, portId) {
  return toFrameList(frames).map((frame) => {
    const value = Object.assign({}, frame);
    if (
      portId &&
      (value.portId === null ||
        value.portId === undefined ||
        value.portId === "")
    ) {
      value.portId = portId;
    }
    return value;
  });
}

function resolveMethodInputPortId(method, requestedPortId) {
  return (
    asString(requestedPortId) ??
    asString(resolvePort(method?.inputPorts, null)?.portId)
  );
}

function getRegistryManifest(registry, pluginId) {
  const plugin = registry?.getPlugin?.(pluginId);
  if (!plugin?.manifest) {
    throw new Error(`Unknown plugin "${pluginId}".`);
  }
  return plugin.manifest;
}

function getTimer(manifest, timerId, methodId) {
  const normalizedTimerId = asString(timerId);
  const normalizedMethodId = asString(methodId);
  return (
    asArray(manifest.timers).find((timer) => {
      if (normalizedTimerId && asString(timer?.timerId) === normalizedTimerId) {
        return true;
      }
      if (
        normalizedMethodId &&
        asString(timer?.methodId) === normalizedMethodId
      ) {
        return true;
      }
      return false;
    }) ?? null
  );
}

function getProtocol(manifest, protocolId) {
  const normalizedProtocolId = asString(protocolId);
  return (
    asArray(manifest.protocols).find(
      (protocol) => asString(protocol?.protocolId) === normalizedProtocolId,
    ) ?? null
  );
}

function formatDurationMs(durationMs) {
  const value =
    typeof durationMs === "bigint" ? durationMs : BigInt(durationMs ?? 0);
  if (value <= 0) {
    return "0ms";
  }
  return `${value.toString()}ms`;
}

export function buildLegacySdnCronSpecs(manifest) {
  const normalizedManifest = asManifest(manifest);
  return asArray(normalizedManifest.timers).map((timer) => {
    const method = getMethod(normalizedManifest, timer?.methodId);
    const inputPort = resolvePort(method?.inputPorts, timer?.inputPortId);
    const outputPort = resolvePort(method?.outputPorts, null);
    return {
      method: asString(timer?.methodId),
      description:
        asString(timer?.description) ??
        asString(method?.description) ??
        asString(method?.displayName),
      default_interval: formatDurationMs(timer?.defaultIntervalMs ?? 0),
      input: inferWireKind(inputPort, method?.inputPorts),
      output: inferWireKind(outputPort, method?.outputPorts),
      timer_id: asString(timer?.timerId),
      input_port_id:
        asString(timer?.inputPortId) ?? asString(inputPort?.portId),
      output_port_id: asString(outputPort?.portId),
    };
  });
}

export function buildLegacySdnProtocolSpecs(manifest) {
  const normalizedManifest = asManifest(manifest);
  return asArray(normalizedManifest.protocols).map((protocol) => {
    const method = getMethod(normalizedManifest, protocol?.methodId);
    const inputPort = resolvePort(method?.inputPorts, protocol?.inputPortId);
    const outputPort = resolvePort(method?.outputPorts, protocol?.outputPortId);
    return {
      protocol_id: asString(protocol?.protocolId),
      method: asString(protocol?.methodId),
      description:
        asString(protocol?.description) ??
        asString(method?.description) ??
        asString(method?.displayName),
      input: inferWireKind(inputPort, method?.inputPorts),
      output: inferWireKind(outputPort, method?.outputPorts),
      input_port_id:
        asString(protocol?.inputPortId) ?? asString(inputPort?.portId),
      output_port_id:
        asString(protocol?.outputPortId) ?? asString(outputPort?.portId),
    };
  });
}

export function buildLegacySdnMetadata(manifest, options = {}) {
  const normalizedManifest = asManifest(manifest);
  return {
    id: asString(options.id) ?? asString(normalizedManifest.pluginId),
    name: asString(options.name) ?? asString(normalizedManifest.name),
    version: asString(options.version) ?? asString(normalizedManifest.version),
    status: asString(options.status) ?? "generated",
    description: asString(options.description),
    plugin_family: enumName(
      PluginFamily,
      normalizedManifest.pluginFamily ?? PluginFamily.ANALYSIS,
      "ANALYSIS",
    ),
    abi_version: Number(normalizedManifest.abiVersion ?? 1),
    methods: asArray(normalizedManifest.methods).map(serializeMethod),
    cron: buildLegacySdnCronSpecs(normalizedManifest),
    protocols: buildLegacySdnProtocolSpecs(normalizedManifest),
    capabilities: asArray(normalizedManifest.capabilities).map(
      serializeCapability,
    ),
    schemas_used: asArray(normalizedManifest.schemasUsed)
      .map(serializeTypeRef)
      .filter(Boolean),
    build_artifacts: asArray(normalizedManifest.buildArtifacts).map(
      serializeBuildArtifact,
    ),
    orbpro_manifest: {
      plugin_id: asString(normalizedManifest.pluginId),
      abi_version: Number(normalizedManifest.abiVersion ?? 1),
    },
  };
}

export function encodeLegacySdnMetadata(manifest, options = {}) {
  return textEncoder.encode(
    JSON.stringify(buildLegacySdnMetadata(manifest, options)),
  );
}

export class SdnCompatAdapter {
  #registry;

  constructor({ registry } = {}) {
    if (!registry) {
      throw new Error("SdnCompatAdapter requires a MethodRegistry instance.");
    }
    this.#registry = registry;
  }

  buildMetadata(pluginId, options = {}) {
    return buildLegacySdnMetadata(
      getRegistryManifest(this.#registry, pluginId),
      options,
    );
  }

  encodeMetadata(pluginId, options = {}) {
    return encodeLegacySdnMetadata(
      getRegistryManifest(this.#registry, pluginId),
      options,
    );
  }

  async invokeCron({
    pluginId,
    timerId = undefined,
    methodId = undefined,
    inputs = [],
    outputStreamCap = 0,
    context = undefined,
  }) {
    const manifest = getRegistryManifest(this.#registry, pluginId);
    const timer = getTimer(manifest, timerId, methodId);
    if (!timer) {
      throw new Error(
        `Plugin "${pluginId}" does not declare timer "${timerId ?? methodId ?? ""}".`,
      );
    }
    const resolvedMethodId = asString(timer.methodId);
    const method = getMethod(manifest, resolvedMethodId);
    const inputPortId = resolveMethodInputPortId(method, timer.inputPortId);
    return this.#registry.invoke({
      pluginId,
      methodId: resolvedMethodId,
      inputs: applyDefaultPortId(inputs, inputPortId),
      outputStreamCap,
      drainPolicy: method?.drainPolicy ?? DrainPolicy.DRAIN_UNTIL_YIELD,
      context: Object.assign({}, context, {
        legacyBridge: "cron",
        timerId: asString(timer.timerId),
      }),
    });
  }

  async invokeProtocol({
    pluginId,
    protocolId,
    inputs = [],
    outputStreamCap = 0,
    context = undefined,
  }) {
    const manifest = getRegistryManifest(this.#registry, pluginId);
    const protocol = getProtocol(manifest, protocolId);
    if (!protocol) {
      throw new Error(
        `Plugin "${pluginId}" does not declare protocol "${protocolId}".`,
      );
    }
    const resolvedMethodId = asString(protocol.methodId);
    const method = getMethod(manifest, resolvedMethodId);
    const inputPortId = resolveMethodInputPortId(method, protocol.inputPortId);
    return this.#registry.invoke({
      pluginId,
      methodId: resolvedMethodId,
      inputs: applyDefaultPortId(inputs, inputPortId),
      outputStreamCap,
      drainPolicy: method?.drainPolicy ?? DrainPolicy.DRAIN_UNTIL_YIELD,
      context: Object.assign({}, context, {
        legacyBridge: "protocol",
        protocolId: asString(protocol.protocolId),
      }),
    });
  }
}
