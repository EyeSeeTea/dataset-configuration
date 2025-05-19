import { AccessData, AccessType } from "$/domain/entities/DataSet";
import { Permission, Permissions } from "$/domain/entities/Permission";
import { Id } from "$/domain/entities/Ref";
import _ from "$/domain/entities/generic/Collection";
import { HashMap } from "$/domain/entities/generic/HashMap";

export class D2ApiSharing {
    buildPermission(permissions: string, permissionType: "data" | "metadata"): Permission {
        const { canRead, canWrite } = this.buildPermissionByType(permissions, permissionType);
        return Permission.create({ read: canRead, write: canWrite });
    }

    generateFullPermission(permissions: Permissions): OctalNotationPermission {
        return [
            this.convertPermissionToOctal(permissions.metadata),
            this.convertPermissionToOctal(permissions.data),
            "----",
        ].join("");
    }

    generateD2PermissionFromAccess(accessData: AccessData): D2ApiSharingName {
        return {
            access: this.generateFullPermission(accessData.permissions),
            id: accessData.id,
            displayName: accessData.name,
        };
    }

    generateSharingData(options: {
        access: AccessData[];
        permissions: Permissions;
    }): D2ApiSharingFieldsSave {
        const { access, permissions } = options;

        const convertToD2AccessRecords = (
            filteredAccess: AccessData[],
            type: AccessType
        ): D2AccessRecords => {
            return _(filteredAccess)
                .filter(access => access.type === type)
                .toHashMap(access => [access.id, this.generateD2PermissionFromAccess(access)])
                .toObject();
        };

        return {
            public: this.generateFullPermission(permissions),
            users: convertToD2AccessRecords(access, "users"),
            userGroups: convertToD2AccessRecords(access, "groups"),
        };
    }

    mapSharingToEntity(sharing: D2ApiSharingFields): {
        access: AccessData[];
        permissions: Permissions;
    } {
        const users = this.buildAccessByType(sharing.users, "users");
        const groups = this.buildAccessByType(sharing.userGroups, "groups");

        const permissions = {
            data: this.buildPermission(sharing.public, "data"),
            metadata: this.buildPermission(sharing.public, "metadata"),
        };

        return { access: users.concat(groups), permissions };
    }

    private buildAccessByType(accessData: D2AccessRecords, type: AccessType): AccessData[] {
        const accessRecords = HashMap.fromObject(accessData).values();
        return accessRecords.map((access): AccessData => {
            return {
                id: access.id,
                name: access.displayName ?? "",
                permissions: {
                    data: this.buildPermission(access.access, "data"),
                    metadata: this.buildPermission(access.access, "metadata"),
                },
                type,
            };
        });
    }

    private convertPermissionToOctal(permission: Permission): OctalNotationPermission {
        return permission.noAccess()
            ? "--"
            : [permission.read ? "r" : "-", permission.write ? "w" : "-"].join("");
    }

    private buildPermissionByType(permissions: string, permissionType: "data" | "metadata") {
        const initialIndex = permissionType === "metadata" ? 0 : 2;
        const canRead = permissions[initialIndex] === "r";
        const canWrite = permissions[initialIndex + 1] === "w";
        return { canRead, canWrite };
    }
}

export type D2ApiSharingFields = {
    external: boolean;
    users: D2AccessRecords;
    userGroups: D2AccessRecords;
    public: string;
};

type D2AccessRecords = Record<UserOrGroupId, D2ApiSharingName>;

export type D2ApiSharingName = {
    displayName?: string;
    access: string;
    id: string;
};

type D2ApiSharingFieldsSave = {
    public: OctalNotationPermission;
    users: D2AccessRecords;
    userGroups: D2AccessRecords;
};

type UserOrGroupId = Id;

// example: r------- // rw------
export type OctalNotationPermission = string;
