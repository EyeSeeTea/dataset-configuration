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
        const readWritePermission = Permission.create({ read: true, write: true });
        return {
            data: readWritePermission,
            metadata: isAdmin
                ? readWritePermission
                : Permission.create({ read: true, write: false }),
        };
    }

    static initialPermissions(): Permissions {
        return {
            data: Permission.create({ read: false, write: false }),
            metadata: Permission.create({ read: false, write: false }),
        };
    }
}

export type Permissions = { data: Permission; metadata: Permission };
