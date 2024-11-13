import { Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";

export type SharingAttrs = { userAccesses: AccessDetails[]; userGroupAccesses: AccessDetails[] };

export type AccessDetails = { id: Id; name: string };

export class Sharing extends Struct<SharingAttrs>() {}
