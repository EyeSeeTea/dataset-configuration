import { Permission } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { Id, ISODateString, OctalNotationPermission } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";

export type DataSetAttrs = {
    created: ISODateString;
    id: Id;
    description: string;
    name: string;
    lastUpdated: ISODateString;
    dataPermissions: Permission;
    metadataPermissions: Permission;
    project: Maybe<Project>;
    shortName: string;
    coreCompetencies: CoreCompetency[];
    access: AccessData[];
    orgUnits: OrgUnit[];
};

export type OrgUnit = { id: Id; name: string; paths: Id[] };

export type AccessData = { id: Id; value: OctalNotationPermission; name: string; type: AccessType };
export type AccessType = "users" | "groups";

export type CoreCompetency = { id: Id; name: string; code: string };

export class DataSet extends Struct<DataSetAttrs>() {
    static buildAccess(data: DataSet): string {
        const dataDescription = DataSet.buildAccessDescription(data.dataPermissions);
        const metadataDescription = DataSet.buildAccessDescription(data.metadataPermissions);
        return `Data: ${dataDescription}, Metadata: ${metadataDescription}`;
    }

    static convertPermissionToOctal(permission: Permission): OctalNotationPermission {
        return permission.noAccess
            ? "--"
            : [permission.canRead ? "r" : "-", permission.canWrite ? "w" : "-"].join("");
    }

    static generateFullPermission(dataSet: DataSet): OctalNotationPermission {
        return `${DataSet.convertPermissionToOctal(
            dataSet.metadataPermissions
        )}${DataSet.convertPermissionToOctal(dataSet.dataPermissions)}----`;
    }

    static joinShortNames(dataSets: DataSet[], separator = ", "): string {
        return dataSets.map(dataSet => dataSet.shortName).join(separator);
    }

    private static buildAccessDescription(permission: Permission): string {
        if (permission.noAccess) {
            return i18n.t("No public access");
        } else if (permission.canWrite && permission.canRead) {
            return i18n.t("Public view/edit");
        } else if (permission.canRead && !permission.canWrite) {
            return i18n.t("Public view");
        } else {
            return "";
        }
    }
}
