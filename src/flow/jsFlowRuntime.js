import { normalizeProgramForSdnFlow } from "./normalize.js";

function cloneFrame(frame, portId) {
  return Object.assign({}, frame, {
    portId,
  });
}

function normalizeQueueDepth(value, fallback = Infinity) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.trunc(numeric));
}

function applyBackpressure(
  queue,
  frames,
  policy = "queue",
  queueDepth = Infinity,
) {
  const normalizedDepth = normalizeQueueDepth(queueDepth);
  const normalizedPolicy = String(policy ?? "queue")
    .trim()
    .toLowerCase();

  for (const frame of frames) {
    if (queue.length < normalizedDepth) {
      queue.push(frame);
      continue;
    }

    if (normalizedPolicy === "drop-oldest") {
      queue.shift();
      queue.push(frame);
    } else if (normalizedPolicy !== "drop-newest") {
      queue.push(frame);
      if (queue.length > normalizedDepth) {
        queue.splice(0, queue.length - normalizedDepth);
      }
    }
  }
}

function getPortQueues(queueMap, nodeId) {
  let portQueues = queueMap.get(nodeId);
  if (!portQueues) {
    portQueues = new Map();
    queueMap.set(nodeId, portQueues);
  }
  return portQueues;
}

function getFrameQueue(queueMap, nodeId, portId) {
  const portQueues = getPortQueues(queueMap, nodeId);
  let queue = portQueues.get(portId);
  if (!queue) {
    queue = [];
    portQueues.set(portId, queue);
  }
  return queue;
}

function snapshotQueues(queueMap) {
  const snapshot = {};
  for (const [nodeId, portQueues] of queueMap.entries()) {
    snapshot[nodeId] = {};
    for (const [portId, frames] of portQueues.entries()) {
      snapshot[nodeId][portId] = frames.length;
    }
  }
  return snapshot;
}

function drainReadyFrames(queue, maxBatch) {
  if (!Array.isArray(queue) || queue.length === 0) {
    return [];
  }
  return queue.splice(0, Math.min(queue.length, maxBatch));
}

export class FlowRuntime {
  #registry;

  #program = null;

  #queueMap = new Map();

  #maxInvocationsPerDrain;

  #onSinkOutput;

  constructor(options = {}) {
    this.#registry = options.registry ?? null;
    this.#maxInvocationsPerDrain = Math.max(
      1,
      Number(options.maxInvocationsPerDrain ?? 1024) || 1024,
    );
    this.#onSinkOutput =
      typeof options.onSinkOutput === "function" ? options.onSinkOutput : null;
  }

  loadProgram(program) {
    this.#program = normalizeProgramForSdnFlow(program);
    this.#queueMap.clear();
    return this.#program;
  }

  getProgram() {
    return this.#program;
  }

  inspectQueues() {
    return snapshotQueues(this.#queueMap);
  }

  enqueueTriggerFrames(triggerId, frames) {
    if (!this.#program) {
      throw new Error("FlowRuntime requires loadProgram() before enqueue.");
    }
    const bindings = this.#program.triggerBindings.filter(
      (binding) => binding.triggerId === triggerId,
    );
    for (const binding of bindings) {
      const queue = getFrameQueue(
        this.#queueMap,
        binding.targetNodeId,
        binding.targetPortId,
      );
      applyBackpressure(
        queue,
        frames.map((frame) => cloneFrame(frame, binding.targetPortId)),
        binding.backpressurePolicy,
        binding.queueDepth,
      );
    }
  }

  enqueueNodeFrames(nodeId, portId, frames, backpressurePolicy, queueDepth) {
    if (!this.#program) {
      throw new Error("FlowRuntime requires loadProgram() before enqueue.");
    }
    const queue = getFrameQueue(this.#queueMap, nodeId, portId);
    applyBackpressure(
      queue,
      frames.map((frame) => cloneFrame(frame, portId)),
      backpressurePolicy,
      queueDepth,
    );
  }

  isIdle() {
    for (const portQueues of this.#queueMap.values()) {
      for (const frames of portQueues.values()) {
        if (frames.length > 0) {
          return false;
        }
      }
    }
    return true;
  }

  async drain(options = {}) {
    if (!this.#program) {
      throw new Error("FlowRuntime requires loadProgram() before drain.");
    }
    if (!this.#registry || typeof this.#registry.invoke !== "function") {
      throw new Error(
        "FlowRuntime requires a MethodRegistry-compatible registry.",
      );
    }

    const maxInvocations = Math.max(
      1,
      Number(options.maxInvocationsPerDrain ?? this.#maxInvocationsPerDrain) ||
        this.#maxInvocationsPerDrain,
    );
    let invocations = 0;

    while (invocations < maxInvocations) {
      let readyNode = null;
      let descriptor = null;
      let inputs = [];

      for (const node of this.#program.nodes ?? []) {
        descriptor = this.#registry.getMethod(node.pluginId, node.methodId);
        if (!descriptor) {
          continue;
        }

        const maxBatch = Math.max(
          1,
          Number(descriptor.method?.maxBatch ?? 1) || 1,
        );
        const portQueues = getPortQueues(this.#queueMap, node.nodeId);
        const candidateInputs = [];
        let missingRequiredInput = false;

        for (const port of descriptor.method?.inputPorts ?? []) {
          const queue = portQueues.get(port.portId) ?? [];
          if (port.required !== false && queue.length === 0) {
            missingRequiredInput = true;
            break;
          }
          if (queue.length > 0) {
            candidateInputs.push(...drainReadyFrames(queue, maxBatch));
          }
        }

        if (missingRequiredInput || candidateInputs.length === 0) {
          continue;
        }

        readyNode = node;
        inputs = candidateInputs;
        break;
      }

      if (!readyNode || !descriptor || inputs.length === 0) {
        break;
      }

      const response = await this.#registry.invoke({
        pluginId: readyNode.pluginId,
        methodId: readyNode.methodId,
        inputs,
        outputStreamCap: Number(options.outputStreamCap ?? 0) || 0,
      });
      invocations += 1;

      for (const outputFrame of response.outputs ?? []) {
        const edges = (this.#program.edges ?? []).filter(
          (edge) =>
            edge.fromNodeId === readyNode.nodeId &&
            edge.fromPortId === outputFrame.portId,
        );
        if (edges.length === 0 && this.#onSinkOutput) {
          await this.#onSinkOutput({
            frame: outputFrame,
            node: readyNode,
            descriptor,
            runtime: this,
          });
          continue;
        }
        for (const edge of edges) {
          const queue = getFrameQueue(
            this.#queueMap,
            edge.toNodeId,
            edge.toPortId,
          );
          applyBackpressure(
            queue,
            [cloneFrame(outputFrame, edge.toPortId)],
            edge.backpressurePolicy,
            edge.queueDepth,
          );
        }
      }

      if (response.yielded === true) {
        break;
      }
    }

    return {
      invocations,
      idle: this.isIdle(),
      queues: this.inspectQueues(),
    };
  }
}

export default FlowRuntime;
