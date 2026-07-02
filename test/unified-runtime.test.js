import { describe, it } from "node:test";
import { expect, jasmine } from "./helpers/jasmineExpect.js";
import {
  BackpressurePolicy,
  FlowEdgeT,
  FlowNodeT,
  FlowProgramT,
  FlowTriggerT,
  TriggerBindingT,
  TriggerKind,
} from "../src/generated/orbpro/flow.js";
import {
  AcceptedTypeSetT,
  DrainPolicy,
  MethodManifestT,
  PluginManifestT,
  PluginFamily,
  PortManifestT,
} from "../src/generated/orbpro/manifest.js";
import {
  BufferMutability,
  BufferOwnership,
  FlatBufferTypeRefT,
  TypedArenaBufferT,
} from "../src/generated/orbpro/stream.js";
import {
  FlowRuntime,
  MethodRegistry,
  decodeFlowProgram,
  decodePluginManifest,
  encodeFlowProgram,
  encodePluginManifest,
} from "./helpers/harnessSurface.js";

describe("Unified Runtime", function () {
  function createTypeRef(schemaName = "OMM.fbs", fileIdentifier = "OMM ") {
    return new FlatBufferTypeRefT(
      schemaName,
      fileIdentifier,
      [1, 2, 3, 4],
      false,
    );
  }

  function createFrame(sequence, overrides = {}) {
    return new TypedArenaBufferT(
      overrides.typeRef ?? createTypeRef(),
      overrides.portId ?? "in",
      8,
      4096 + sequence * 64,
      64,
      BufferOwnership.SHARED,
      0,
      BufferMutability.IMMUTABLE,
      BigInt(100 + sequence),
      overrides.streamId ?? 1,
      BigInt(sequence),
      false,
    );
  }

  function createManifest() {
    const accepted = new AcceptedTypeSetT(
      "orbital",
      [createTypeRef()],
      "Orbital SDS frames",
    );
    return new PluginManifestT(
      "com.orbpro.runtime.test",
      "Runtime Test",
      "0.1.0",
      PluginFamily.ANALYSIS,
      [
        new MethodManifestT(
          "process",
          "Process",
          [new PortManifestT("in", "Input", [accepted], 1, 1, true, null)],
          [new PortManifestT("out", "Output", [accepted], 1, 1, true, null)],
          1,
          DrainPolicy.DRAIN_UNTIL_YIELD,
          "Single-record drain method",
        ),
      ],
      [],
      [],
      [],
      [createTypeRef()],
      [],
      1,
    );
  }

  it("encodes and decodes unified plugin manifests", function () {
    const bytes = encodePluginManifest(createManifest());
    const manifest = decodePluginManifest(bytes);

    expect(manifest.pluginId).toBe("com.orbpro.runtime.test");
    expect(manifest.methods.length).toBe(1);
    expect(
      manifest.methods[0].inputPorts[0].acceptedTypeSets[0].allowedTypes[0]
        .schemaName,
    ).toBe("OMM.fbs");
  });

  it("registers and invokes manifest-driven methods", async function () {
    const registry = new MethodRegistry();
    registry.registerPlugin({
      manifest: createManifest(),
      handlers: {
        process: ({ inputs }) => ({
          outputs: inputs.map((frame) =>
            Object.assign({}, frame, { portId: "out" }),
          ),
          backlogRemaining: 0,
          yielded: false,
        }),
      },
    });

    const response = await registry.invoke({
      pluginId: "com.orbpro.runtime.test",
      methodId: "process",
      inputs: [createFrame(1)],
    });

    expect(response.outputs.length).toBe(1);
    expect(response.outputs[0].portId).toBe("out");
    expect(response.outputs[0].sequence).toBe(BigInt(1));
  });

  it("drains a subscription-fed single-record method until queues are empty", async function () {
    const registry = new MethodRegistry();
    const seen = [];
    registry.registerPlugin({
      manifest: createManifest(),
      handlers: {
        process: ({ inputs }) => ({
          outputs: inputs.map((frame) => {
            seen.push(Number(frame.sequence));
            return Object.assign({}, frame, { portId: "out" });
          }),
          backlogRemaining: 0,
          yielded: false,
        }),
      },
    });

    const flow = new FlowProgramT(
      "flow.runtime.test",
      "Runtime Flow",
      "0.1.0",
      [
        new FlowNodeT(
          "node-1",
          "com.orbpro.runtime.test",
          "process",
          1,
          DrainPolicy.DRAIN_UNTIL_YIELD,
          1000,
        ),
      ],
      [],
      [
        new FlowTriggerT(
          "trigger-1",
          TriggerKind.PUBSUB_SUBSCRIPTION,
          "/spacedatanetwork/sds/OMM.fbs",
          null,
          BigInt(0),
          [createTypeRef()],
          "subscription",
        ),
      ],
      [
        new TriggerBindingT(
          "trigger-1",
          "node-1",
          "in",
          BackpressurePolicy.QUEUE,
          8,
        ),
      ],
      ["com.orbpro.runtime.test"],
      "Drain test flow",
    );

    const runtime = new FlowRuntime({
      registry,
      maxInvocationsPerDrain: 16,
    });
    runtime.loadProgram(decodeFlowProgram(encodeFlowProgram(flow)));
    runtime.enqueueTriggerFrames("trigger-1", [
      createFrame(1),
      createFrame(2),
      createFrame(3),
    ]);

    const result = await runtime.drain();

    expect(result.invocations).toBe(3);
    expect(result.idle).toBeTrue();
    expect(seen).toEqual([1, 2, 3]);
  });

  it("routes outputs across edges into downstream nodes", async function () {
    const registry = new MethodRegistry();
    const sinkSeen = [];

    const sinkManifest = new PluginManifestT(
      "com.orbpro.runtime.sink",
      "Sink",
      "0.1.0",
      PluginFamily.ANALYSIS,
      [
        new MethodManifestT(
          "sink",
          "Sink",
          [
            new PortManifestT(
              "in",
              "Input",
              [new AcceptedTypeSetT("orbital", [createTypeRef()], null)],
              1,
              1,
              true,
              null,
            ),
          ],
          [],
          1,
          DrainPolicy.DRAIN_UNTIL_YIELD,
          null,
        ),
      ],
      [],
      [],
      [],
      [createTypeRef()],
      [],
      1,
    );

    registry.registerPlugin({
      manifest: createManifest(),
      handlers: {
        process: ({ inputs }) => ({
          outputs: inputs.map((frame) =>
            Object.assign({}, frame, { portId: "out" }),
          ),
          backlogRemaining: 0,
          yielded: false,
        }),
      },
    });
    registry.registerPlugin({
      manifest: sinkManifest,
      handlers: {
        sink: ({ inputs }) => {
          sinkSeen.push(Number(inputs[0].sequence));
          return { outputs: [], backlogRemaining: 0, yielded: false };
        },
      },
    });

    const runtime = new FlowRuntime({
      registry,
      maxInvocationsPerDrain: 16,
    });
    runtime.loadProgram(
      new FlowProgramT(
        "flow.runtime.route",
        "Route",
        "0.1.0",
        [
          new FlowNodeT(
            "processor",
            "com.orbpro.runtime.test",
            "process",
            1,
            DrainPolicy.DRAIN_UNTIL_YIELD,
            1000,
          ),
          new FlowNodeT(
            "sink",
            "com.orbpro.runtime.sink",
            "sink",
            6,
            DrainPolicy.DRAIN_UNTIL_YIELD,
            1000,
          ),
        ],
        [
          new FlowEdgeT(
            "edge-1",
            "processor",
            "out",
            "sink",
            "in",
            [createTypeRef()],
            BackpressurePolicy.QUEUE,
            8,
          ),
        ],
        [],
        [],
        ["com.orbpro.runtime.test", "com.orbpro.runtime.sink"],
        "Route outputs",
      ),
    );

    runtime.enqueueNodeFrames("processor", "in", [createFrame(9)]);
    const result = await runtime.drain();

    expect(result.idle).toBeTrue();
    expect(sinkSeen).toEqual([9]);
  });
});
