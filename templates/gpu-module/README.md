# GPU Module Template

This template is the SDK starting point for modules that can use WebGPU in the
browser and Dawn in a native WasmEdge host while keeping a portable CPU
fallback.

## Files

- `include/space_data_gpu_abi.h`: shared C/C++ layout ABI for GPU-capable
  module code and host adapters.
- `manifest.json`: starter manifest showing the `gpu_compute` capability.

## Runtime Shape

Keep the canonical module artifact at:

```text
dist/isomorphic/module.wasm
```

That artifact must run without GPU access. Put optional GPU adapters beside it:

```text
dist/browser/module.js
dist/wasmedge/gpu-host.{so,dylib,dll}
```

The browser adapter owns WebGPU. The WasmEdge host extension owns Dawn. The
module owns correctness, fallback, and final result validation.

## C++ Integration

Include the ABI header from module or host code:

```cpp
#include "space_data_gpu_abi.h"
```

Use `SdnGpuSplitF64` for double-like values that must cross into WGSL as two
`f32` values:

```cpp
SdnGpuVec3SplitF64 position = sdn_gpu_split_vec3_f64(x_km, y_km, z_km);
```

Use the dispatch/result descriptor structs for host adapter boundaries. Do not
store raw pointers in manifests, publication metadata, or durable runtime
records.
