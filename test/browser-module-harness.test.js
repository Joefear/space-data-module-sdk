import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanupCompilation,
  compileModuleFromSource,
} from "../src/index.js";
import {
  createBrowserModuleHarness,
  detectArtifactProfile,
} from "../src/testing/browserModuleHarness.js";

function createPort(portId, required = true) {
  return {
    portId,
    acceptedTypeSets: [
      {
        setId: `${portId}-any`,
        allowedTypes: [{ acceptsAnyFlatbuffer: true }],
      },
    ],
    minStreams: required ? 1 : 0,
    maxStreams: 1,
    required,
  };
}

function createManifest() {
  return {
    pluginId: "com.digitalarsenal.examples.browser-module-harness",
    name: "Browser Module Harness Host Access Test",
    version: "0.1.0",
    pluginFamily: "analysis",
    runtimeTargets: ["browser", "wasmedge"],
    invokeSurfaces: ["command"],
    methods: [
      {
        methodId: "echo",
        displayName: "echo",
        inputPorts: [createPort("request", true)],
        outputPorts: [createPort("response", false)],
        maxBatch: 1,
        drainPolicy: "single-shot",
      },
    ],
  };
}

function createEchoSource() {
  return `#include <stdint.h>
#include "space_data_module_invoke.h"

int echo(void) {
  const plugin_input_frame_t *frame = plugin_get_input_frame(0);
  if (!frame) {
    plugin_set_error("missing-frame", "No input frame was provided.");
    return 3;
  }
  plugin_push_output(
    "response",
    frame->schema_name,
    frame->file_identifier,
    frame->payload,
    frame->payload_length
  );
  return 0;
}
`;
}

function createEnvMemoryImportModuleBytes() {
  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
    0x02, 0x10, 0x01, 0x03, 0x65, 0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d,
    0x6f, 0x72, 0x79, 0x02, 0x03, 0x01, 0x01,
    0x03, 0x02, 0x01, 0x00,
    0x07, 0x12, 0x01, 0x0e, 0x72, 0x65, 0x61, 0x64, 0x5f, 0x66, 0x69,
    0x72, 0x73, 0x74, 0x5f, 0x69, 0x33, 0x32, 0x00, 0x00,
    0x0a, 0x09, 0x01, 0x07, 0x00, 0x41, 0x00, 0x28, 0x02, 0x00, 0x0b,
  ]);
}

function createExportedMemoryModuleBytes() {
  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x05, 0x03, 0x01, 0x00, 0x01,
    0x07, 0x0a, 0x01, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02,
    0x00,
  ]);
}

test("browser module harness exposes awaited host dispatch alongside module invoke", async (t) => {
  const compilation = await compileModuleFromSource({
    manifest: createManifest(),
    sourceCode: createEchoSource(),
    language: "c",
  });
  t.after(async () => {
    await cleanupCompilation(compilation);
  });

  const harness = await createBrowserModuleHarness({
    wasmSource: compilation.wasmBytes,
    hostOptions: {
      capabilities: [
        "filesystem",
        "network",
        "ipfs",
        "protocol_handle",
        "protocol_dial",
      ],
      capabilityAdapters: {
        filesystem: {
          resolvePath(path) {
            return `/virtual/${path}`;
          },
          async mkdir(path) {
            return {
              path: `/virtual/${path}`,
            };
          },
          async writeFile(path, value, options) {
            return {
              path: `/virtual/${path}`,
              value,
              encoding: options?.encoding ?? null,
            };
          },
          async readFile(path, options) {
            return `harness:${path}:${options?.encoding ?? "bytes"}`;
          },
        },
        network: {
          async request(params) {
            return {
              transport: params.transport,
              url: params.url,
            };
          },
        },
        ipfs: {
          async resolve(params) {
            return {
              path: params.path,
              cid: "bafyharnesscid",
            };
          },
        },
        protocol_handle: {
          async register(params) {
            return {
              registered: params.protocolId,
            };
          },
        },
        protocol_dial: {
          async dial(params) {
            return {
              dialed: params.protocolId,
              peerId: params.peerId,
            };
          },
        },
      },
    },
  });
  t.after(() => {
    harness.destroy();
  });

  const invokeResponse = await harness.invoke({
    methodId: "echo",
    inputs: [
      {
        portId: "request",
        typeRef: {
          schemaName: "Blob.fbs",
          fileIdentifier: "BLOB",
        },
        payload: new TextEncoder().encode("hello from harness"),
      },
    ],
  });
  const mkdirResponse = await harness.callHost("filesystem.mkdir", {
    path: "cache",
    recursive: true,
  });
  const writeResponse = await harness.callHost("filesystem.writeFile", {
    path: "cache/host.txt",
    value: "from host dispatch",
    encoding: "utf8",
  });
  const filesystemResponse = await harness.callHost("filesystem.readFile", {
    path: "cache/host.txt",
    encoding: "utf8",
  });
  const networkResponse = await harness.callHost("network.request", {
    transport: "http",
    url: "https://example.test/harness",
    responseType: "json",
  });
  const ipfsResponse = await harness.callHost("ipfs.invoke", {
    operation: "resolve",
    path: "/ipns/harness-demo",
  });
  const registerResponse = await harness.callHost("protocol_handle.register", {
    protocolId: "/space-data-network/module-delivery/1.0.0",
  });
  const dialResponse = await harness.callHost("protocol_dial.dial", {
    protocolId: "/space-data-network/module-delivery/1.0.0",
    peerId: "12D3KooWHarnessPeer",
  });

  assert.equal(invokeResponse.statusCode, 0);
  assert.equal(
    new TextDecoder().decode(invokeResponse.outputs[0].payload),
    "hello from harness",
  );
  assert.deepEqual(mkdirResponse, {
    path: "/virtual/cache",
  });
  assert.deepEqual(writeResponse, {
    path: "/virtual/cache/host.txt",
    value: "from host dispatch",
    encoding: "utf8",
  });
  assert.equal(filesystemResponse, "harness:cache/host.txt:utf8");
  assert.deepEqual(networkResponse, {
    transport: "http",
    url: "https://example.test/harness",
  });
  assert.deepEqual(ipfsResponse, {
    path: "/ipns/harness-demo",
    cid: "bafyharnesscid",
  });
  assert.deepEqual(registerResponse, {
    registered: "/space-data-network/module-delivery/1.0.0",
  });
  assert.deepEqual(dialResponse, {
    dialed: "/space-data-network/module-delivery/1.0.0",
    peerId: "12D3KooWHarnessPeer",
  });
});

test("browser module harness accepts shared imported memory for standalone modules", async (t) => {
  const wasmSource = createEnvMemoryImportModuleBytes();
  const wasmModule = new WebAssembly.Module(wasmSource);
  const memory = new WebAssembly.Memory({
    initial: 1,
    maximum: 1,
    shared: true,
  });
  new DataView(memory.buffer).setInt32(0, 0x12345678, true);

  assert.equal(detectArtifactProfile(wasmModule), "standalone");

  const harness = await createBrowserModuleHarness({
    wasmSource,
    memory,
  });
  t.after(() => {
    harness.destroy();
  });

  assert.equal(harness.memory, memory);
  assert.equal(harness.instance.exports.read_first_i32(), 0x12345678);
});

test("browser module harness fails early when shared memory is requested but the module exports non-shared memory", async () => {
  await assert.rejects(
    createBrowserModuleHarness({
      wasmSource: createExportedMemoryModuleBytes(),
      sharedMemory: true,
    }),
    /shared WebAssembly\.Memory/i,
  );
});
