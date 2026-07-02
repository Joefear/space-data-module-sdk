import { describe, it } from "node:test";
import { expect, jasmine } from "./helpers/jasmineExpect.js";
import {
  AcceptedTypeSetT,
  MethodManifestT,
  PluginFamily,
  PluginManifestT,
  PortManifestT,
  ProtocolSpecT,
  TimerSpecT,
} from "../src/generated/orbpro/manifest.js";
import { FlatBufferTypeRefT } from "../src/generated/orbpro/stream.js";
import { generateLegacySdnShimSource } from "./helpers/harnessSurface.js";

describe("SDN Shim Generator", function () {
  function createTypeRef() {
    return new FlatBufferTypeRefT(
      "orbpro.sds.OMM",
      "OMM ",
      [1, 2, 3, 4],
      false,
    );
  }

  function createManifest(overrides = {}) {
    const methods = overrides.methods ?? [
      new MethodManifestT(
        "poll",
        "Poll",
        [
          new PortManifestT(
            "tick",
            "Tick",
            [new AcceptedTypeSetT("tick", [createTypeRef()], null)],
            1,
            1,
            true,
            null,
          ),
        ],
        [
          new PortManifestT(
            "samples",
            "Samples",
            [new AcceptedTypeSetT("samples", [createTypeRef()], null)],
            1,
            1,
            true,
            null,
          ),
        ],
        1,
        1,
        null,
      ),
      new MethodManifestT(
        "handle_request",
        "Handle Request",
        [
          new PortManifestT(
            "request",
            "Request",
            [new AcceptedTypeSetT("request", [createTypeRef()], null)],
            1,
            1,
            true,
            null,
          ),
        ],
        [
          new PortManifestT(
            "response",
            "Response",
            [new AcceptedTypeSetT("response", [createTypeRef()], null)],
            1,
            1,
            true,
            null,
          ),
        ],
        1,
        1,
        null,
      ),
    ];

    return new PluginManifestT(
      "com.orbpro.compat.demo",
      "Compatibility Demo",
      "0.2.0",
      PluginFamily.COMMS,
      methods,
      [],
      overrides.timers ?? [
        new TimerSpecT("poll-5s", "poll", "tick", BigInt(5000), null),
      ],
      overrides.protocols ?? [
        new ProtocolSpecT(
          "/sdn/orbit/1.0.0",
          "handle_request",
          "request",
          "response",
          null,
        ),
      ],
      [createTypeRef()],
      [],
      2,
    );
  }

  it("generates legacy SDN exports from a canonical manifest and method table", function () {
    const source = generateLegacySdnShimSource({
      manifest: createManifest(),
      methodTable: {
        poll: { cronSymbol: "orbpro_poll" },
        handle_request: { requestSymbol: "orbpro_handle_request" },
      },
      metadataOptions: { status: "running" },
    });

    expect(source).toContain("int32_t plugin_get_metadata");
    expect(source).toContain("int32_t plugin_handle_request");
    expect(source).toContain("int32_t plugin_cron");
    expect(source).toContain("extern int32_t orbpro_poll(");
    expect(source).toContain("extern int32_t orbpro_handle_request(");
    expect(source).toContain(
      'orbpro_sdn_method_equals(method_ptr, method_len, "poll")',
    );
    expect(source).toContain("return orbpro_handle_request(");
    expect(source).toContain(
      "SDN compatibility shims for com.orbpro.compat.demo",
    );
  });

  it("throws when multiple protocol methods are declared without an explicit legacy request binding", function () {
    const manifest = createManifest({
      protocols: [
        new ProtocolSpecT(
          "/sdn/one/1.0.0",
          "handle_request",
          "request",
          "response",
          null,
        ),
        new ProtocolSpecT(
          "/sdn/two/1.0.0",
          "alternate_request",
          "request",
          "response",
          null,
        ),
      ],
      methods: [
        ...createManifest().methods,
        new MethodManifestT(
          "alternate_request",
          "Alternate Request",
          [new PortManifestT("request", "Request", [], 1, 1, true, null)],
          [new PortManifestT("response", "Response", [], 1, 1, true, null)],
          1,
          1,
          null,
        ),
      ],
    });

    expect(function () {
      generateLegacySdnShimSource({
        manifest,
        methodTable: {
          handle_request: { requestSymbol: "orbpro_handle_request" },
          alternate_request: { requestSymbol: "orbpro_alt_request" },
          poll: { cronSymbol: "orbpro_poll" },
        },
      });
    }).toThrowError(/multiple protocol methods/i);
  });

  it("throws when a declared timer method is missing a cron handler binding", function () {
    expect(function () {
      generateLegacySdnShimSource({
        manifest: createManifest(),
        methodTable: {
          handle_request: { requestSymbol: "orbpro_handle_request" },
        },
      });
    }).toThrowError(/missing a cronSymbol/i);
  });

  it("emits a request stub when the manifest has no protocol bindings", function () {
    const source = generateLegacySdnShimSource({
      manifest: createManifest({ protocols: [] }),
      methodTable: {
        poll: { cronSymbol: "orbpro_poll" },
      },
    });

    expect(source).toContain("return ORBPRO_SDN_ERR_REQUEST_UNAVAILABLE;");
  });
});
