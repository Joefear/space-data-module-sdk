import { describe, it } from "node:test";
import { expect, jasmine } from "./helpers/jasmineExpect.js";
import {
  createDependencyStreamBridge,
  decodeStreamInvokeRequest,
  encodeStreamInvokeResponse,
} from "./helpers/harnessSurface.js";
import {
  BufferMutability,
  BufferOwnership,
  FlatBufferTypeRefT,
  TypedArenaBufferT,
} from "../src/generated/orbpro/stream.js";

describe("Dependency Stream Bridge", function () {
  it("stages input bytes into dependency memory and decodes response outputs", async function () {
    const memory = new WebAssembly.Memory({ initial: 1 });
    const heap = new Uint8Array(memory.buffer);
    let allocPointer = 256;
    const freedPointers = [];

    function malloc(size) {
      const pointer = allocPointer;
      allocPointer += Number(size || 0);
      return pointer;
    }

    function free(pointer) {
      freedPointers.push(Number(pointer));
    }

    let outputPointer = 0;
    const dependency = {
      memory,
      resolvedExports: {
        malloc,
        free,
      },
      invokeRawStream(requestBytes) {
        const request = decodeStreamInvokeRequest(requestBytes);
        expect(request.methodId).toBe("propagate");
        expect(request.inputs.length).toBe(1);
        expect(request.inputs[0].portId).toBe("in");
        expect(request.inputs[0].offset).toBeGreaterThan(0);
        expect(request.inputs[0].size).toBe(3);
        expect(request.inputs[0].typeRef.schemaName).toBe("orbpro.sds.OMM");
        expect(
          Array.from(
            heap.subarray(
              request.inputs[0].offset,
              request.inputs[0].offset + request.inputs[0].size,
            ),
          ),
        ).toEqual([1, 2, 3]);

        outputPointer = malloc(2);
        heap.set([9, 10], outputPointer);

        return encodeStreamInvokeResponse({
          outputs: [
            new TypedArenaBufferT(
              new FlatBufferTypeRefT("orbpro.sds.OEM", "OEM ", [], false),
              "out",
              8,
              outputPointer,
              2,
              BufferOwnership.BORROWED,
              0,
              BufferMutability.IMMUTABLE,
              44n,
              12,
              13n,
              false,
            ),
          ],
          backlogRemaining: 0,
          yielded: false,
          errorCode: 0,
          errorMessage: null,
        });
      },
      cloneBytes(offset, size) {
        return new Uint8Array(heap.slice(offset, offset + size));
      },
      release(pointer) {
        free(pointer);
      },
    };

    const bridge = createDependencyStreamBridge();
    const result = await bridge({
      methodId: "propagate",
      inputs: [
        {
          portId: "in",
          bytes: new Uint8Array([1, 2, 3]),
          streamId: 7,
          sequence: 8,
          traceToken: 9,
          typeRef: {
            schemaName: "orbpro.sds.OMM",
            fileIdentifier: "OMM ",
            schemaHash: [0xde, 0xad, 0xbe, 0xef],
            acceptsAnyFlatbuffer: false,
          },
        },
      ],
      outputStreamCap: 4,
      instantiatedDependency: dependency,
    });

    expect(result.statusCode).toBe(0);
    expect(result.backlogRemaining).toBe(0);
    expect(result.yielded).toBe(false);
    expect(result.outputs.length).toBe(1);
    expect(result.outputs[0].portId).toBe("out");
    expect(Array.from(result.outputs[0].bytes)).toEqual([9, 10]);
    expect(freedPointers).toContain(outputPointer);
    expect(freedPointers.length).toBeGreaterThan(1);
  });
});
