# GPU Module ABI

This document defines the SDK-level standard for modules that can use GPU
compute acceleration while remaining portable across browser and WasmEdge
module runtimes.

## Scope

The standard covers:

- the manifest capability used by module authors
- the host-owned async dispatch boundary used by browsers and native hosts
- the C/C++ layout header shared by module code, browser adapters, and native
  Dawn-backed hosts
- the artifact layout for portable CPU fallback plus optional GPU adapters

It does not add a new SDS FlatBuffer schema or a new `space_data_module_host`
sync import. GPU dispatch is asynchronous in browser WebGPU and must stay
outside the current sync guest hostcall bridge.

## Capability

GPU-capable modules declare the coarse capability id:

```json
{
  "capability": "gpu_compute",
  "scope": "webgpu.v1",
  "required": false,
  "description": "Optional WebGPU/Dawn compute acceleration."
}
```

Use `required: false` unless the module has no correct CPU path. A missing GPU
adapter must degrade to the module's CPU implementation, not to an incomplete
result.

The `gpu_compute` id is part of the SDK recommended capability vocabulary. The
typed PLG `HOST_CAPABILITIES` enum cannot carry a dedicated GPU enum value
until the canonical standards schema adds one. Until that SDS change lands,
module manifests should use the string/object capability form above and avoid
claiming a typed PLG host capability enum for GPU.

## Artifact Layout

The canonical portable artifact remains:

```text
dist/isomorphic/module.wasm
```

That artifact must be valid without GPU access. Optional GPU adapters belong
outside the shared guest binary:

```text
dist/browser/module.js
dist/browser/module.wasm
dist/wasmedge/gpu-host.{so,dylib,dll}
```

The browser adapter owns the browser `GPUDevice`. The WasmEdge host extension
owns the native Dawn instance/device. The guest module owns correctness,
fallback, exact refinement, and final result validation.

## ABI Layers

### 1. Data Layout ABI

The reusable C/C++ header is:

```text
templates/gpu-module/include/space_data_gpu_abi.h
```

It defines:

- `SDN_GPU_ABI_VERSION`
- the `gpu_compute` capability id and `webgpu.v1` scope
- status codes
- backend and buffer role enums
- split `f64` helpers using high/low `f32`
- packed dispatch/result descriptors

All multi-byte fields are little-endian in serialized buffers. Structs in the
header are fixed-width and intentionally avoid owning pointers. Pointers are
runtime-local implementation details and must not appear in durable manifests,
publication metadata, or cross-process descriptors.

### 2. Host Dispatch ABI

The canonical operation is:

```text
gpu_compute.dispatch.v1
```

The host adapter receives:

- an ABI version
- a stable kernel id
- storage/uniform buffer descriptors
- little-endian input bytes
- requested workgroup counts
- declared output buffer sizes

The host adapter returns:

- a status code
- backend metadata (`browser-webgpu`, `dawn-native`, or `cpu-fallback`)
- output buffer bytes
- optional counters such as candidates emitted, overflow count, and elapsed
  device time

Browser and native hosts may expose this through their existing async
capability adapter registries. A shared browser/WasmEdge guest must not depend
on raw asynchronous wasm imports for this operation.

### 3. Module-Level API

Module methods should keep the public invoke contract domain-specific. For
example, a conjunction assessment module should expose conjunction assessment
request/response ports, not generic WebGPU command buffers.

The GPU dispatch boundary is an implementation detail between the host runtime
and the module/adapter pair. Hosts may precompute a GPU broadphase and pass
coarse hits into the guest, or they may let a browser-specific adapter call the
guest's exact refinement entry points after dispatch.

## Browser Backend

Browser adapters use WebGPU through browser APIs or Emscripten's WebGPU/Dawn
surface. They must:

- request and cache the `GPUAdapter` and `GPUDevice`
- validate device limits before accepting a dispatch
- compile WGSL from a module-owned or SDK-owned source string
- copy results back through mapped buffers or equivalent browser APIs
- return a CPU fallback status when WebGPU is unavailable

Browser WebGPU setup and buffer mapping are asynchronous. Do not model them as
sync `space_data_module_host` calls.

## WasmEdge Backend

WasmEdge deployments that need GPU acceleration should use a native host
extension linked against Dawn. The native host implements the same
`gpu_compute.dispatch.v1` operation and uses the same C/C++ layout header.

The shared module artifact should still be loadable without that extension. A
pure `["wasmedge"]` artifact may choose a higher-capability native host profile,
but a `["browser", "wasmedge"]` artifact must retain the portable fallback
contract documented in `docs/browser-wasmedge-isomorphic.md`.

## Numerical Rules

GPU kernels that need double-like position precision should use split high/low
`f32` values:

```c
SdnGpuSplitF64 x = sdn_gpu_split_f64(x_km);
```

For orbital screening, store position components in kilometers unless a module
contract states otherwise. The high component is the nearest `f32`; the low
component is the residual:

```text
hi = f32(value)
lo = f32(value - f64(hi))
```

GPU broadphase kernels must be conservative. They may emit extra candidates,
but they must not drop candidates that the CPU exact path would refine. Exact
TCA, probability, and final acceptance logic remain in the CPU double-precision
module path unless a module ships a separately validated exact GPU algorithm.

## Template

Start new GPU-capable modules from:

```text
templates/gpu-module/
```

The template contains:

- `include/space_data_gpu_abi.h`: reusable C/C++ ABI layout header
- `manifest.json`: manifest fragment showing `gpu_compute`
- `README.md`: integration notes for browser WebGPU and WasmEdge/Dawn hosts

Use the template as a layout and ABI starting point. Real module repos should
still define domain-specific FlatBuffer request/response schemas and must keep
their canonical compiled artifact at `dist/isomorphic/module.wasm`.
