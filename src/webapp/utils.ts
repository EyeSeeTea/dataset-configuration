import React from "react";
import { DataSetOrderFields } from "$/domain/repositories/DataSetRepository";
import { Maybe } from "$/utils/ts-utils";
import { NO_ACCESS_NOTATION, Permission } from "$/domain/entities/Permission";
import { Permissions } from "$/domain/entities/DataSet";

export function parseSortField(sortFieldName: string): DataSetOrderFields {
    switch (sortFieldName) {
        case "name":
            return "name";
        case "lastUpdated":
            return "lastUpdated";
        default:
            throw new Error(`Unknown sort field: ${sortFieldName}`);
    }
}

export function component<Props>(comp: React.FC<Props>) {
    comp.displayName = comp.name?.replace(/_+$/, "") || "UnknownComponent";
    return React.memo(comp);
}

export function buildDataPermissions(
    value: Maybe<string>,
    permissionType: "data" | "metadata"
): Maybe<Permission> {
    return value ? generatePermissionsFromString(value, permissionType) : undefined;
}

export function generatePermissionsFromString(
    value: string,
    permissionType: "data" | "metadata"
): Permission {
    if (!value || value === NO_ACCESS_NOTATION) return Permission.buildWithOutAccess();

    const initialIndex = permissionType === "metadata" ? 0 : 2;
    const canRead = value[initialIndex] === "r";
    const canWrite = value[initialIndex + 1] === "w";
    return Permission.create({ read: canRead, write: canWrite });
}

export function convertPermissionToOctal(permission: Permission): string {
    return permission.noAccess()
        ? "--"
        : [permission.read ? "r" : "-", permission.write ? "w" : "-"].join("");
}

export function generateFullPermission(permissions: Permissions): string {
    return `${convertPermissionToOctal(permissions.metadata)}${convertPermissionToOctal(
        permissions.data
    )}----`;
}
