import { describe, it } from "node:test";
import { expect, jasmine } from "./helpers/jasmineExpect.js";
import {
  AcceptedTypeSetT,
  BuildArtifactT,
  CapabilityKind,
  DrainPolicy,
  HostCapabilityT,
  MethodManifestT,
  PluginFamily,
  PluginManifestT,
  PortManifestT,
  ProtocolSpecT,
  TimerSpecT,
} from "../src/generated/orbpro/manifest.js";
import { FlatBufferTypeRefT } from "../src/generated/orbpro/stream.js";
import {
  buildLegacySdnCronSpecs,
  buildLegacySdnMetadata,
  buildLegacySdnProtocolSpecs,
  encodeLegacySdnMetadata,
  encodePluginManifest,
  MethodRegistry,
  SdnCompatAdapter,
} from "./helpers/harnessSurface.js";

describe("SDN Compatibility Bridge", function () {
  function createTypeRef(overrides = {}) {
    return new FlatBufferTypeRefT(
      overrides.schemaName ?? "orbpro.sds.OMM",
      overrides.fileIdentifier ?? "OMM ",
      overrides.schemaHash ?? [0xde, 0xad, 0xbe, 0xef],
      overrides.acceptsAnyFlatbuffer ?? false,
    );
  }

  function createManifest() {
    const orbitalType = createTypeRef();
    const anyType = createTypeRef({
      schemaName: "orbpro.any",
      fileIdentifier: "ANY ",
      schemaHash: [],
      acceptsAnyFlatbuffer: true,
    });

    return new PluginManifestT(
      "com.orbpro.compat.demo",
      "Compatibility Demo",
      "0.2.0",
      PluginFamily.COMMS,
      [
        new MethodManifestT(
          "poll",
          "Poll",
          [
            new PortManifestT(
              "tick",
              "Tick",
              [new AcceptedTypeSetT("tick", [anyType], "Timer tick frames")],
              1,
              1,
              true,
              "Timer tick input",
            ),
          ],
          [
            new PortManifestT(
              "samples",
              "Samples",
              [new AcceptedTypeSetT("orbital", [orbitalType], "Orbital SDS")],
              1,
              1,
              true,
              "Sample output",
            ),
          ],
          1,
          DrainPolicy.DRAIN_UNTIL_YIELD,
          "Polls upstream sources",
        ),
        new MethodManifestT(
          "handle_request",
          "Handle Request",
          [
            new PortManifestT(
              "request",
              "Request",
              [new AcceptedTypeSetT("orbital", [orbitalType], "Request frame")],
              1,
              4,
              true,
              "Inbound requests",
            ),
          ],
          [
            new PortManifestT(
              "response",
              "Response",
              [
                new AcceptedTypeSetT(
                  "orbital",
                  [orbitalType],
                  "Response frame",
                ),
              ],
              1,
              1,
              true,
              "Outbound responses",
            ),
          ],
          16,
          DrainPolicy.DRAIN_TO_EMPTY,
          "Handles libp2p protocol traffic",
        ),
      ],
      [
        new HostCapabilityT(
          CapabilityKind.TIMERS,
          "runtime",
          true,
          "Needs timer scheduling",
        ),
        new HostCapabilityT(
          CapabilityKind.PROTOCOL_HANDLE,
          "/sdn/orbit/1.0.0",
          true,
          "Handles inbound SDN requests",
        ),
      ],
      [
        new TimerSpecT(
          "poll-5s",
          "poll",
          "tick",
          BigInt(5000),
          "Collect every 5 seconds",
        ),
      ],
      [
        new ProtocolSpecT(
          "/sdn/orbit/1.0.0",
          "handle_request",
          "request",
          "response",
          "Primary request protocol",
        ),
      ],
      [orbitalType, anyType],
      [
        new BuildArtifactT(
          "wasm-module",
          "wasm",
          "dist/plugin.wasm",
          "wasm32-wasip1",
          "_start",
        ),
      ],
      2,
    );
  }

  it("projects timer manifests into legacy SDN cron specs", function () {
    const cron = buildLegacySdnCronSpecs(createManifest());

    expect(cron).toEqual([
      jasmine.objectContaining({
        method: "poll",
        description: "Collect every 5 seconds",
        default_interval: "5000ms",
        input: "flatbuffer",
        output: "flatbuffer",
        timer_id: "poll-5s",
        input_port_id: "tick",
        output_port_id: "samples",
      }),
    ]);
  });

  it("projects protocol handlers into legacy SDN protocol descriptors", function () {
    const protocols = buildLegacySdnProtocolSpecs(createManifest());

    expect(protocols).toEqual([
      jasmine.objectContaining({
        protocol_id: "/sdn/orbit/1.0.0",
        method: "handle_request",
        description: "Primary request protocol",
        input: "flatbuffer",
        output: "flatbuffer",
        input_port_id: "request",
        output_port_id: "response",
      }),
    ]);
  });

  it("serializes a canonical manifest into legacy SDN metadata JSON shape", function () {
    const metadata = buildLegacySdnMetadata(createManifest(), {
      status: "running",
      description: "Generated from OrbPro manifest",
    });

    expect(metadata.id).toBe("com.orbpro.compat.demo");
    expect(metadata.status).toBe("running");
    expect(metadata.description).toBe("Generated from OrbPro manifest");
    expect(metadata.plugin_family).toBe("COMMS");
    expect(metadata.abi_version).toBe(2);
    expect(metadata.methods[1]).toEqual(
      jasmine.objectContaining({
        method: "handle_request",
        max_batch: 16,
        drain_policy: "DRAIN_TO_EMPTY",
      }),
    );
    expect(metadata.capabilities).toEqual([
      jasmine.objectContaining({
        capability: "TIMERS",
        scope: "runtime",
        required: true,
      }),
      jasmine.objectContaining({
        capability: "PROTOCOL_HANDLE",
        scope: "/sdn/orbit/1.0.0",
        required: true,
      }),
    ]);
    expect(metadata.schemas_used).toContain(
      jasmine.objectContaining({
        schema_name: "orbpro.sds.OMM",
        file_identifier: "OMM ",
        schema_hash: "deadbeef",
      }),
    );
    expect(metadata.build_artifacts).toEqual([
      jasmine.objectContaining({
        artifact_id: "wasm-module",
        kind: "wasm",
        path: "dist/plugin.wasm",
      }),
    ]);
  });

  it("encodes legacy SDN metadata bytes from a binary manifest buffer", function () {
    const bytes = encodeLegacySdnMetadata(
      encodePluginManifest(createManifest()),
      {
        status: "running",
      },
    );
    const parsed = JSON.parse(new TextDecoder().decode(bytes));

    expect(parsed.id).toBe("com.orbpro.compat.demo");
    expect(parsed.status).toBe("running");
    expect(parsed.cron[0].method).toBe("poll");
    expect(parsed.protocols[0].protocol_id).toBe("/sdn/orbit/1.0.0");
  });

  it("routes legacy cron invocations into canonical methods", async function () {
    const seen = [];
    const registry = new MethodRegistry();
    registry.registerPlugin({
      manifest: createManifest(),
      handlers: {
        poll: ({ inputs, context }) => {
          seen.push({
            portId: inputs[0].portId,
            legacyBridge: context.legacyBridge,
            timerId: context.timerId,
          });
          return {
            outputs: inputs.map((frame) =>
              Object.assign({}, frame, { portId: "samples" }),
            ),
            backlogRemaining: 0,
            yielded: false,
          };
        },
        handle_request: () => ({
          outputs: [],
          backlogRemaining: 0,
          yielded: false,
        }),
      },
    });

    const adapter = new SdnCompatAdapter({ registry });
    const response = await adapter.invokeCron({
      pluginId: "com.orbpro.compat.demo",
      timerId: "poll-5s",
      inputs: [{ typeRef: createTypeRef(), streamId: 1, sequence: BigInt(1) }],
    });

    expect(seen).toEqual([
      {
        portId: "tick",
        legacyBridge: "cron",
        timerId: "poll-5s",
      },
    ]);
    expect(response.outputs[0].portId).toBe("samples");
  });

  it("routes legacy protocol invocations into canonical methods", async function () {
    const seen = [];
    const registry = new MethodRegistry();
    registry.registerPlugin({
      manifest: createManifest(),
      handlers: {
        poll: () => ({ outputs: [], backlogRemaining: 0, yielded: false }),
        handle_request: ({ inputs, context }) => {
          seen.push({
            portId: inputs[0].portId,
            legacyBridge: context.legacyBridge,
            protocolId: context.protocolId,
          });
          return {
            outputs: inputs.map((frame) =>
              Object.assign({}, frame, { portId: "response" }),
            ),
            backlogRemaining: 0,
            yielded: false,
          };
        },
      },
    });

    const adapter = new SdnCompatAdapter({ registry });
    const response = await adapter.invokeProtocol({
      pluginId: "com.orbpro.compat.demo",
      protocolId: "/sdn/orbit/1.0.0",
      inputs: [{ typeRef: createTypeRef(), streamId: 7, sequence: BigInt(9) }],
    });

    expect(seen).toEqual([
      {
        portId: "request",
        legacyBridge: "protocol",
        protocolId: "/sdn/orbit/1.0.0",
      },
    ]);
    expect(response.outputs[0].portId).toBe("response");
  });
});
