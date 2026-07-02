import * as flatbuffers from "flatbuffers";
import { FlowEdge, FlowEdgeT } from "./flow-edge.js";
import { FlowNode, FlowNodeT } from "./flow-node.js";
import { FlowTrigger, FlowTriggerT } from "./flow-trigger.js";
import { TriggerBinding, TriggerBindingT } from "./trigger-binding.js";
/**
 * Root flow program.
 */
export declare class FlowProgram implements flatbuffers.IUnpackableObject<FlowProgramT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): FlowProgram;
  static getRootAsFlowProgram(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowProgram,
  ): FlowProgram;
  static getSizePrefixedRootAsFlowProgram(
    bb: flatbuffers.ByteBuffer,
    obj?: FlowProgram,
  ): FlowProgram;
  static bufferHasIdentifier(bb: flatbuffers.ByteBuffer): boolean;
  programId(): string;
  programId(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  name(): string;
  name(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  version(): string | null;
  version(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
  nodes(index: number, obj?: FlowNode): FlowNode | null;
  nodesLength(): number;
  edges(index: number, obj?: FlowEdge): FlowEdge | null;
  edgesLength(): number;
  triggers(index: number, obj?: FlowTrigger): FlowTrigger | null;
  triggersLength(): number;
  triggerBindings(index: number, obj?: TriggerBinding): TriggerBinding | null;
  triggerBindingsLength(): number;
  requiredPlugins(index: number): string;
  requiredPlugins(
    index: number,
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array;
  requiredPluginsLength(): number;
  description(): string | null;
  description(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  static startFlowProgram(builder: flatbuffers.Builder): void;
  static addProgramId(
    builder: flatbuffers.Builder,
    programIdOffset: flatbuffers.Offset,
  ): void;
  static addName(
    builder: flatbuffers.Builder,
    nameOffset: flatbuffers.Offset,
  ): void;
  static addVersion(
    builder: flatbuffers.Builder,
    versionOffset: flatbuffers.Offset,
  ): void;
  static addNodes(
    builder: flatbuffers.Builder,
    nodesOffset: flatbuffers.Offset,
  ): void;
  static createNodesVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startNodesVector(builder: flatbuffers.Builder, numElems: number): void;
  static addEdges(
    builder: flatbuffers.Builder,
    edgesOffset: flatbuffers.Offset,
  ): void;
  static createEdgesVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startEdgesVector(builder: flatbuffers.Builder, numElems: number): void;
  static addTriggers(
    builder: flatbuffers.Builder,
    triggersOffset: flatbuffers.Offset,
  ): void;
  static createTriggersVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startTriggersVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addTriggerBindings(
    builder: flatbuffers.Builder,
    triggerBindingsOffset: flatbuffers.Offset,
  ): void;
  static createTriggerBindingsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startTriggerBindingsVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addRequiredPlugins(
    builder: flatbuffers.Builder,
    requiredPluginsOffset: flatbuffers.Offset,
  ): void;
  static createRequiredPluginsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset;
  static startRequiredPluginsVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static addDescription(
    builder: flatbuffers.Builder,
    descriptionOffset: flatbuffers.Offset,
  ): void;
  static endFlowProgram(builder: flatbuffers.Builder): flatbuffers.Offset;
  static finishFlowProgramBuffer(
    builder: flatbuffers.Builder,
    offset: flatbuffers.Offset,
  ): void;
  static finishSizePrefixedFlowProgramBuffer(
    builder: flatbuffers.Builder,
    offset: flatbuffers.Offset,
  ): void;
  static createFlowProgram(
    builder: flatbuffers.Builder,
    programIdOffset: flatbuffers.Offset,
    nameOffset: flatbuffers.Offset,
    versionOffset: flatbuffers.Offset,
    nodesOffset: flatbuffers.Offset,
    edgesOffset: flatbuffers.Offset,
    triggersOffset: flatbuffers.Offset,
    triggerBindingsOffset: flatbuffers.Offset,
    requiredPluginsOffset: flatbuffers.Offset,
    descriptionOffset: flatbuffers.Offset,
  ): flatbuffers.Offset;
  unpack(): FlowProgramT;
  unpackTo(_o: FlowProgramT): void;
}
export declare class FlowProgramT implements flatbuffers.IGeneratedObject {
  programId: string | Uint8Array | null;
  name: string | Uint8Array | null;
  version: string | Uint8Array | null;
  nodes: FlowNodeT[];
  edges: FlowEdgeT[];
  triggers: FlowTriggerT[];
  triggerBindings: TriggerBindingT[];
  requiredPlugins: string[];
  description: string | Uint8Array | null;
  constructor(
    programId?: string | Uint8Array | null,
    name?: string | Uint8Array | null,
    version?: string | Uint8Array | null,
    nodes?: FlowNodeT[],
    edges?: FlowEdgeT[],
    triggers?: FlowTriggerT[],
    triggerBindings?: TriggerBindingT[],
    requiredPlugins?: string[],
    description?: string | Uint8Array | null,
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=flow-program.d.ts.map
