import * as flatbuffers from "flatbuffers";
/**
 * Pins a schema hash into a deployable bundle.
 */
export declare class SchemaHashBinding implements flatbuffers.IUnpackableObject<SchemaHashBindingT> {
  bb: flatbuffers.ByteBuffer | null;
  bb_pos: number;
  __init(i: number, bb: flatbuffers.ByteBuffer): SchemaHashBinding;
  static getRootAsSchemaHashBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: SchemaHashBinding,
  ): SchemaHashBinding;
  static getSizePrefixedRootAsSchemaHashBinding(
    bb: flatbuffers.ByteBuffer,
    obj?: SchemaHashBinding,
  ): SchemaHashBinding;
  schemaName(): string;
  schemaName(optionalEncoding: flatbuffers.Encoding): string | Uint8Array;
  fileIdentifier(): string | null;
  fileIdentifier(
    optionalEncoding: flatbuffers.Encoding,
  ): string | Uint8Array | null;
  schemaHash(index: number): number | null;
  schemaHashLength(): number;
  schemaHashArray(): Uint8Array | null;
  static startSchemaHashBinding(builder: flatbuffers.Builder): void;
  static addSchemaName(
    builder: flatbuffers.Builder,
    schemaNameOffset: flatbuffers.Offset,
  ): void;
  static addFileIdentifier(
    builder: flatbuffers.Builder,
    fileIdentifierOffset: flatbuffers.Offset,
  ): void;
  static addSchemaHash(
    builder: flatbuffers.Builder,
    schemaHashOffset: flatbuffers.Offset,
  ): void;
  static createSchemaHashVector(
    builder: flatbuffers.Builder,
    data: number[] | Uint8Array,
  ): flatbuffers.Offset;
  static startSchemaHashVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ): void;
  static endSchemaHashBinding(builder: flatbuffers.Builder): flatbuffers.Offset;
  static createSchemaHashBinding(
    builder: flatbuffers.Builder,
    schemaNameOffset: flatbuffers.Offset,
    fileIdentifierOffset: flatbuffers.Offset,
    schemaHashOffset: flatbuffers.Offset,
  ): flatbuffers.Offset;
  unpack(): SchemaHashBindingT;
  unpackTo(_o: SchemaHashBindingT): void;
}
export declare class SchemaHashBindingT
  implements flatbuffers.IGeneratedObject
{
  schemaName: string | Uint8Array | null;
  fileIdentifier: string | Uint8Array | null;
  schemaHash: number[];
  constructor(
    schemaName?: string | Uint8Array | null,
    fileIdentifier?: string | Uint8Array | null,
    schemaHash?: number[],
  );
  pack(builder: flatbuffers.Builder): flatbuffers.Offset;
}
//# sourceMappingURL=schema-hash-binding.d.ts.map
