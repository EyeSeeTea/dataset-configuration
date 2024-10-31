import { Struct } from "$/domain/entities/generic/Struct";

export type PermissionAttrs = { read: boolean; write: boolean };

export const NO_ACCESS_NOTATION = "--------";

export class Permission extends Struct<PermissionAttrs>() {
    noAccess(): boolean {
        return this.read === false && this.write === false;
    }

    static buildWithOutAccess(): Permission {
        return Permission.create({ read: false, write: false });
    }
}
