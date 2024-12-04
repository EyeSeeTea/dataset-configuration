import { Permissions } from "$/domain/entities/DataSet";
import { Struct } from "$/domain/entities/generic/Struct";

export type PermissionAttrs = { read: boolean; write: boolean };

export class Permission extends Struct<PermissionAttrs>() {
    noAccess(): boolean {
        return !this.read && !this.write;
    }

    static buildWithOutAccess(): Permission {
        return Permission.create({ read: false, write: false });
    }

    static setDefaultPermissionsForGroups(isAdmin: boolean): Permissions {
        const adminDataPermission = Permission.create({ read: true, write: true });
        return {
            data: adminDataPermission,
            metadata: isAdmin
                ? adminDataPermission
                : Permission.create({ read: true, write: false }),
        };
    }
}
