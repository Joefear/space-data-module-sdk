#ifndef SPACE_DATA_GPU_ABI_H
#define SPACE_DATA_GPU_ABI_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SDN_GPU_ABI_VERSION 1u
#define SDN_GPU_CAPABILITY_ID "gpu_compute"
#define SDN_GPU_CAPABILITY_SCOPE_WEBGPU_V1 "webgpu.v1"

typedef enum SdnGpuStatus {
  SDN_GPU_STATUS_OK = 0,
  SDN_GPU_STATUS_UNAVAILABLE = 1,
  SDN_GPU_STATUS_UNSUPPORTED_ABI = 2,
  SDN_GPU_STATUS_INVALID_DESCRIPTOR = 3,
  SDN_GPU_STATUS_LIMIT_EXCEEDED = 4,
  SDN_GPU_STATUS_DISPATCH_FAILED = 5,
  SDN_GPU_STATUS_OUTPUT_OVERFLOW = 6
} SdnGpuStatus;

typedef enum SdnGpuBackendKind {
  SDN_GPU_BACKEND_UNKNOWN = 0,
  SDN_GPU_BACKEND_BROWSER_WEBGPU = 1,
  SDN_GPU_BACKEND_DAWN_NATIVE = 2,
  SDN_GPU_BACKEND_CPU_FALLBACK = 3
} SdnGpuBackendKind;

typedef enum SdnGpuBufferRole {
  SDN_GPU_BUFFER_ROLE_STORAGE_READ = 1u << 0,
  SDN_GPU_BUFFER_ROLE_STORAGE_WRITE = 1u << 1,
  SDN_GPU_BUFFER_ROLE_UNIFORM = 1u << 2,
  SDN_GPU_BUFFER_ROLE_INDIRECT = 1u << 3
} SdnGpuBufferRole;

typedef enum SdnGpuScalarFormat {
  SDN_GPU_SCALAR_FORMAT_U8 = 1,
  SDN_GPU_SCALAR_FORMAT_U32 = 2,
  SDN_GPU_SCALAR_FORMAT_I32 = 3,
  SDN_GPU_SCALAR_FORMAT_F32 = 4,
  SDN_GPU_SCALAR_FORMAT_SPLIT_F64 = 5
} SdnGpuScalarFormat;

typedef struct SdnGpuSplitF64 {
  float hi;
  float lo;
} SdnGpuSplitF64;

typedef struct SdnGpuVec3SplitF64 {
  SdnGpuSplitF64 x;
  SdnGpuSplitF64 y;
  SdnGpuSplitF64 z;
} SdnGpuVec3SplitF64;

typedef struct SdnGpuBufferDesc {
  uint32_t role;
  uint32_t scalar_format;
  uint32_t record_stride;
  uint32_t reserved0;
  uint64_t byte_offset;
  uint64_t byte_length;
} SdnGpuBufferDesc;

typedef struct SdnGpuDispatchDesc {
  uint32_t abi_version;
  uint32_t descriptor_byte_length;
  uint32_t kernel_id_hash;
  uint32_t flags;
  uint32_t input_count;
  uint32_t output_count;
  uint32_t uniform_byte_length;
  uint32_t reserved0;
  uint32_t workgroup_count_x;
  uint32_t workgroup_count_y;
  uint32_t workgroup_count_z;
  uint32_t workgroup_size_x;
  uint32_t workgroup_size_y;
  uint32_t workgroup_size_z;
  uint32_t reserved1;
  uint32_t reserved2;
} SdnGpuDispatchDesc;

typedef struct SdnGpuDispatchResult {
  uint32_t abi_version;
  uint32_t status;
  uint32_t backend_kind;
  uint32_t flags;
  uint64_t output_bytes_written;
  uint64_t records_emitted;
  uint64_t overflow_count;
  double elapsed_ms;
} SdnGpuDispatchResult;

static inline SdnGpuSplitF64 sdn_gpu_split_f64(double value) {
  SdnGpuSplitF64 result;
  result.hi = (float)value;
  result.lo = (float)(value - (double)result.hi);
  return result;
}

static inline double sdn_gpu_join_split_f64(SdnGpuSplitF64 value) {
  return (double)value.hi + (double)value.lo;
}

static inline SdnGpuVec3SplitF64 sdn_gpu_split_vec3_f64(
    double x,
    double y,
    double z) {
  SdnGpuVec3SplitF64 result;
  result.x = sdn_gpu_split_f64(x);
  result.y = sdn_gpu_split_f64(y);
  result.z = sdn_gpu_split_f64(z);
  return result;
}

#ifdef __cplusplus
}
#endif

#endif
