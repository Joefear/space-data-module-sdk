import * as flatbuffers from "flatbuffers/mjs/flatbuffers.js";

import {
  CapabilityKind,
  DrainPolicy,
  HostCapabilityT,
  PluginFamily,
  PluginManifest,
} from "../generated/orbpro/manifest.js";
import { normalizeInvokeSurfaceName } from "../invoke/codec.js";
import { toUint8Array } from "../runtime/bufferLike.js";
import { legacyManifestToPlg } from "./legacyToPlg.js";
import { decodePlgManifest, encodePlgManifest, isPlgManifestBuffer } from "./plgCodec.js";

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

function normalizeEnumName(name, { separator = "_", lowercase = true } = {}) {
  if (typeof name !== "string" || name.length === 0) {
    return null;
  }
  const normalized = name.trim();
  if (!normalized) {
    return null;
  }
  const joined = normalized.replace(/_/g, separator);
  return lowercase ? joined.toLowerCase() : joined;
}

function normalizePluginFamilyName(value) {
  if (typeof value === "number" && typeof PluginFamily[value] === "string") {
    return normalizeEnumName(PluginFamily[value], { separator: "_" });
  }
  return normalizeEnumName(value, { separator: "_" });
}

function normalizePlgPluginFamilyName(value) {
  if (typeof value === "number") {
    switch (value) {
      case 0:
        return "sensor";
      case 1:
        return "propagator";
      case 2:
        return "renderer";
      case 4:
        return "data_source";
      case 5:
        return "ew";
      case 6:
        return "comms";
      case 7:
        return "physics";
      case 8:
        return "shader";
      case 3:
      default:
        return "analysis";
    }
  }
  const normalized = normalizeEnumName(value, { separator: "_" });
  return normalized === "datasource" ? "data_source" : normalized;
}

function normalizeDrainPolicyName(value) {
  if (typeof value === "number" && typeof DrainPolicy[value] === "string") {
    return normalizeEnumName(DrainPolicy[value], { separator: "-" });
  }
  return normalizeEnumName(value, { separator: "-" });
}

function normalizeCapabilityName(value) {
  if (
    typeof value === "number" &&
    typeof CapabilityKind[value] === "string"
  ) {
    return normalizeEnumName(CapabilityKind[value], { separator: "_" });
  }
  return normalizeEnumName(value, { separator: "_" });
}

function normalizeDecodedCapabilities(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return normalizeCapabilityName(entry);
      }
      if (!(entry instanceof HostCapabilityT) && (!entry || typeof entry !== "object")) {
        return null;
      }
      const capability = normalizeCapabilityName(entry.capability);
      if (!capability) {
        return null;
      }
      const scope =
        typeof entry.scope === "string" && entry.scope.trim().length > 0
          ? entry.scope.trim()
          : null;
      const description =
        typeof entry.description === "string" &&
        entry.description.trim().length > 0
          ? entry.description.trim()
          : null;
      const required = entry.required !== false;
      if (!scope && !description && required) {
        return capability;
      }
      return {
        capability,
        ...(scope ? { scope } : {}),
        ...(required === false ? { required: false } : {}),
        ...(description ? { description } : {}),
      };
    })
    .filter(Boolean);
}

function normalizeDecodedMethod(method = {}) {
  return {
    ...method,
    drainPolicy: normalizeDrainPolicyName(method.drainPolicy),
  };
}

function typeRefFromSchemaName(schemaName) {
  return typeof schemaName === "string" && schemaName.length > 0
    ? { schemaName }
    : null;
}

function portFromSchemaName(schemaName, index, direction) {
  const typeRef = typeRefFromSchemaName(schemaName);
  if (!typeRef) {
    return null;
  }
  return {
    portId: `${direction}-${index + 1}`,
    acceptedTypeSets: [
      {
        setId: schemaName,
        allowedTypes: [typeRef],
      },
    ],
    minStreams: 0,
    maxStreams: 1,
    required: false,
  };
}

function methodFromPlgEntry(entry = {}) {
  const methodId = entry.name;
  if (typeof methodId !== "string" || methodId.length === 0) {
    return null;
  }
  const inputPorts = Array.isArray(entry.inputSchemas)
    ? entry.inputSchemas
        .map((schemaName, index) => portFromSchemaName(schemaName, index, "input"))
        .filter(Boolean)
    : [];
  const outputPort = portFromSchemaName(entry.outputSchema, 0, "output");
  return {
    methodId,
    displayName: methodId,
    description: entry.description,
    inputPorts,
    outputPorts: outputPort ? [outputPort] : [],
    maxBatch: 1,
    drainPolicy: "single-shot",
  };
}

function normalizeDecodedPlgManifest(manifest = {}) {
  const methods = Array.isArray(manifest.methods) && manifest.methods.length > 0
    ? manifest.methods.map((method) => normalizeDecodedMethod(method))
    : Array.isArray(manifest.entryFunctions)
    ? manifest.entryFunctions.map((entry) => methodFromPlgEntry(entry)).filter(Boolean)
    : [];
  const hostCapabilities = Array.isArray(manifest.hostCapabilities)
    ? manifest.hostCapabilities
    : [];
  const capabilities = hostCapabilities.length > 0
    ? hostCapabilities.map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        if (entry.scope || entry.description || entry.required === false) {
          return entry;
        }
        return entry.capability;
      }).filter(Boolean)
    : Array.isArray(manifest.capabilities)
      ? manifest.capabilities.map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (entry?.name && entry.required !== false && !entry.version) {
            return entry.name;
          }
          return entry;
        })
      : [];
  return {
    ...manifest,
    pluginFamily:
      manifest.pluginFamily ?? normalizePlgPluginFamilyName(manifest.pluginType),
    methods,
    capabilities,
    hostCapabilities,
    invokeSurfaces: Array.isArray(manifest.invokeSurfaces)
      ? manifest.invokeSurfaces
          .map((value) => normalizeInvokeSurfaceName(value))
          .filter(Boolean)
      : [],
    runtimeTargets: Array.isArray(manifest.runtimeTargets)
      ? manifest.runtimeTargets
      : [],
  };
}

export function decodePluginManifest(data) {
  const bytes = toUint8Array(data);
  if (bytes && isPlgManifestBuffer(bytes)) {
    return normalizeDecodedPlgManifest(decodePlgManifest(bytes));
  }
  const bb = toByteBuffer(data);
  if (!PluginManifest.bufferHasIdentifier(bb)) {
    throw new Error("Plugin manifest buffer identifier mismatch.");
  }
  const unpacked = PluginManifest.getRootAsPluginManifest(bb).unpack();
  return {
    ...unpacked,
    pluginFamily: normalizePluginFamilyName(unpacked.pluginFamily),
    capabilities: normalizeDecodedCapabilities(unpacked.capabilities),
    methods: Array.isArray(unpacked.methods)
      ? unpacked.methods.map((method) => normalizeDecodedMethod(method))
      : [],
    invokeSurfaces: Array.isArray(unpacked.invokeSurfaces)
      ? unpacked.invokeSurfaces
          .map((value) => normalizeInvokeSurfaceName(value))
          .filter(Boolean)
      : [],
  };
}

export function encodePluginManifest(manifest) {
  return encodePlgManifest(legacyManifestToPlg(manifest));
}
