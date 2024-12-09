import { Permission } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { Id, ISODateString, Ref } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";
import { Either } from "$/domain/entities/generic/Either";
import { ValidationError } from "$/domain/entities/generic/Error";
import { validateOrgUnits, validateRequired } from "$/domain/entities/generic/Validation";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";

export type DataSetAttrs = {
    created: ISODateString;
    id: Id;
    description: string;
    name: string;
    lastUpdated: ISODateString;
    permissions: Permissions;
    project: Maybe<Project>;
    coreCompetencies: CoreCompetency[];
    access: AccessData[];
    orgUnits: OrgUnit[];
    expiryDays: number;
    openFuturePeriods: number;
    notifyUser: boolean;
};

// export type DataSetToSave = Omit<DataSetAttrs, "orgUnits" | "created" | "lastUpdated"> & {
//     orgUnits: Ref[];
// };

export type OrgUnit = { id: Id; name: string; path: Id[] };
export type Permissions = { data: Permission; metadata: Permission };
export type AccessData = { id: Id; permissions: Permissions; name: string; type: AccessType };
export type AccessType = "users" | "groups";

export type CoreCompetency = { id: Id; name: string; code: string };
export type DataSetList = Pick<DataSetAttrs, "id" | "name" | "lastUpdated" | "permissions">;

export class DataSet extends Struct<DataSetAttrs>() {
    get shortName(): string {
        return this.truncateValue(this.name);
    }

    private truncateValue(input: string): string {
        const targetLength = 50;
        return input.length > targetLength ? input.slice(0, targetLength) : input;
    }

    validateSetup(): Either<ValidationError<DataSet>[], DataSet> {
        const errors: ValidationError<DataSet>[] = [
            {
                property: "name" as const,
                errors: validateRequired(this.name),
                value: this.name,
            },
            {
                property: "orgUnits" as const,
                errors: validateOrgUnits(this.orgUnits),
                value: this.orgUnits,
            },
        ].filter(validation => validation.errors.length > 0);

        return errors.length === 0 ? Either.success(this) : Either.error(errors);
    }

    updateProject(project: Maybe<Project>): DataSet {
        const name = project ? `${project.name} DataSet` : "";
        return this._update({ project, name });
    }

    update<K extends keyof DataSet>(fieldName: K, value: DataSet[K]): DataSet {
        return this._update({ [fieldName]: value });
    }

    setOrgUnits(orgUnits: Ref[]): DataSetToSave {
        const idsNotPresent = orgUnits.some(orgUnit => orgUnit.id === "");
        if (idsNotPresent) {
            throw new Error("Invalid org unit id");
        }
        return DataSet.create({ ...this, orgUnits });
    }

    static buildAccess(permissions: Permissions): string {
        const dataDescription = DataSet.buildAccessDescription(permissions.data);
        const metadataDescription = DataSet.buildAccessDescription(permissions.metadata);
        return `Data: ${dataDescription}, Metadata: ${metadataDescription}`;
    }

    static joinShortNames(dataSets: DataSet[], separator = ", "): string {
        return dataSets.map(dataSet => dataSet.shortName).join(separator);
    }

    private static buildAccessDescription(permission: Permission): string {
        if (permission.noAccess()) {
            return i18n.t("No public access");
        } else if (permission.write && permission.read) {
            return i18n.t("Public view/edit");
        } else if (permission.read && !permission.write) {
            return i18n.t("Public view");
        } else {
            return "";
        }
    }

    static initial(id: Id): DataSet {
        return DataSet.create({
            access: [],
            coreCompetencies: [],
            created: "",
            description: "",
            id,
            lastUpdated: "",
            name: "",
            orgUnits: [],
            permissions: {
                data: Permission.create({ read: false, write: false }),
                metadata: Permission.create({ read: false, write: false }),
            },
            project: undefined,
            expiryDays: 0,
            openFuturePeriods: 0,
            notifyUser: false,
        });
    }
}
