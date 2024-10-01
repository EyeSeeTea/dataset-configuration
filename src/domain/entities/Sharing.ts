import { Id, OctalNotationPermission } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";

export type SharingAttrs = {
    publicAccess: OctalNotationPermission;
    userAccesses: AccessDetails[];
    userGroupAccesses: AccessDetails[];
};

export type AccessDetails = { id: Id; name: string };

export class Sharing extends Struct<SharingAttrs>() {}
