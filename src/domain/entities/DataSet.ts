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
import { Indicator } from "$/domain/entities/Indicator";
import { Config, UserGroup } from "$/domain/entities/Config";

export type DataSetAttrs = {
    created: ISODateString;
    id: Id;
    description: string;
    name: string;
    lastUpdated: ISODateString;
    permissions: Permissions;
    project: Maybe<Project>;
    shortName: string;
    coreCompetencies: CoreCompetency[];
    access: AccessData[];
    orgUnits: OrgUnit[];
    expiryDays: number;
    openFuturePeriods: number;
    notifyUser: boolean;
    indicators: Indicator[];
};

export type DataSetToSave = Omit<DataSetAttrs, "orgUnits" | "created" | "lastUpdated"> & {
    orgUnits: Ref[];
};

export type OrgUnit = { id: Id; code: string; name: string; path: Id[] };
export type Permissions = { data: Permission; metadata: Permission };
export type AccessData = { id: Id; permissions: Permissions; name: string; type: AccessType };
export type AccessType = "users" | "groups";

export type CoreCompetency = { id: Id; name: string; code: string };
export type DataSetList = Pick<DataSetAttrs, "id" | "name" | "lastUpdated" | "permissions">;

export class DataSet extends Struct<DataSetAttrs>() {
    validate(): Either<ValidationError<DataSet>[], DataSet> {
        const allErrors = this.getValidationErrors();
        return allErrors.length === 0 ? Either.success(this) : Either.error(allErrors);
    }

    validateSetup(): Either<ValidationError<DataSet>[], DataSet> {
        const errors = this.buildSetupErrors();
        return errors.length === 0 ? Either.success(this) : Either.error(errors);
    }

    updateProject(project: Maybe<Project>, config: Config): DataSet {
        const name = project ? `${project.name} DataSet` : "";
        const orgUnits = project ? project.orgsUnits : this.orgUnits;

        const accessGroupsFromProject = this.getAccessFromProject(project, config);

        return this._update({ access: accessGroupsFromProject, project, name, orgUnits });
    }

    updateAccess(config: Config): DataSet {
        const accessGroupsFromProject = this.getAccessFromProject(this.project, config);
        const accessFromOrgUnits = this.getAccessFromOrgUnits(this.orgUnits, config);

        return this._update({
            access: this.project ? accessGroupsFromProject : accessFromOrgUnits,
        });
    }

    updateAccessFromRegionsCodes(codes: string[], config: Config): DataSet {
        const access = codes.flatMap(code => {
            const userGroups = config.userGroups.filter(userGroup => userGroup.code === code);
            return this.buildAccessGroups(userGroups);
        });
        return this._update({ access: access });
    }

    update(fieldName: keyof DataSet, value: string | number | boolean): DataSet {
        return this._update({ [fieldName]: value });
    }

    setOrgUnits(orgUnits: Ref[]): DataSetToSave {
        const idsNotPresent = orgUnits.some(orgUnit => orgUnit.id === "");
        if (idsNotPresent) {
            throw new Error("Invalid org unit id");
        }
        return DataSet.create({ ...this, orgUnits });
    }

    setIndicators(indicators: Indicator[]): DataSet {
        return this._update({ indicators });
    }

    validateIndicatorsStep(): Either<ValidationError<DataSet>[], DataSet> {
        return this.indicators.length > 0
            ? Either.success(this)
            : Either.error([
                  {
                      property: "indicators" as const,
                      errors: ["indicators_required"],
                      value: this.indicators,
                  },
              ]);
    }

    validateSharingStep(): Either<ValidationError<DataSet>[], DataSet> {
        if (this.project) return Either.success(this);

        const regionCodesFromOrgUnits = this.getRegionCodesFromAccess();

        return regionCodesFromOrgUnits.length > 0
            ? Either.success(this)
            : Either.error([
                  {
                      property: "access" as const,
                      errors: ["regions_required"],
                      value: this.access,
                  },
              ]);
    }

    getRegionCodesFromAccess(): string[] {
        return _(this.access)
            .filter(access => access.type === "groups")
            .compactMap(access => access.name.split("_")[0])
            .uniq()
            .value();
    }

    static createEmpty(id: Id, initialData: Partial<DataSetAttrs> = {}): DataSet {
        return DataSet.create({
            indicators: [],
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
            shortName: "",
            expiryDays: 0,
            openFuturePeriods: 0,
            notifyUser: false,
            ...initialData,
        });
    }

    static buildAccess(permissions: Permissions): string {
        const dataDescription = DataSet.buildAccessDescription(permissions.data);
        const metadataDescription = DataSet.buildAccessDescription(permissions.metadata);
        return `Data: ${dataDescription}, Metadata: ${metadataDescription}`;
    }

    static joinShortNames(dataSets: DataSet[], separator = ", "): string {
        return dataSets.map(dataSet => dataSet.shortName).join(separator);
    }

    private getValidationErrors(): ValidationError<DataSet>[] {
        const setupErrors = this.buildSetupErrors();
        const indicatorsErrors = this.validateIndicatorsStep().value.error || [];
        const sharingErrors = this.validateSharingStep().value.error || [];

        return [...setupErrors, ...indicatorsErrors, ...sharingErrors];
    }

    private buildSetupErrors(): ValidationError<DataSet>[] {
        return [
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

    private getAccessFromOrgUnits(orgUnits: OrgUnit[], config: Config): AccessData[] {
        const orgsUnitsCodes = orgUnits.map(orgUnit => orgUnit.code.slice(0, 2));

        const regions = config.regions.filter(region => orgsUnitsCodes.includes(region.code));
        const regionsCodes = regions.map(region => region.code);

        const userGroups = config.userGroups.filter(userGroup =>
            regionsCodes.includes(userGroup.code)
        );

        return this.buildAccessGroups(userGroups);
    }

    private getAccessFromProject(project: Maybe<Project>, config: Config): AccessData[] {
        if (!project || !project.code) return [];
        const regionCode = (project.code?.slice(0, 2) || "").toUpperCase();

        const region = config.regions.find(region => region.code === regionCode);
        const userGroups = config.userGroups.filter(userGroup => userGroup.code === region?.code);

        return this.buildAccessGroups(userGroups);
    }

    private buildAccessGroups(userGroups: UserGroup[]): AccessData[] {
        return userGroups.map(userGroup => this.setAccessPermissionGroup(userGroup));
    }

    private setAccessPermissionGroup(userGroup: UserGroup): AccessData {
        const isAdmin = userGroup.name.split("_")[1]?.toLowerCase() === "administrators";
        return {
            id: userGroup.id,
            name: userGroup.name,
            permissions: Permission.setDefaultPermissionsForGroups(isAdmin),
            type: "groups",
        };
    }
}
