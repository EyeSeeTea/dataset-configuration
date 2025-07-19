import { Permission, Permissions } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { Id, ISODateString, Ref } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";
import { ValidationError } from "$/domain/entities/generic/Error";
import { validateOrgUnits, validateRequired } from "$/domain/entities/generic/Validation";
import { Indicator, IndicatorType } from "$/domain/entities/Indicator";
import { Config } from "$/domain/entities/Config";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { extractRegionCode } from "$/domain/entities/Region";
import { DatePeriod } from "$/domain/entities/DatePeriod";
import { UserGroup } from "$/domain/entities/UserGroup";
import { User } from "$/domain/entities/User";
import { DataSetList } from "$/domain/entities/DataSetList";
import { IndicatorMatch } from "$/domain/entities/IndicatorMatch";

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
    indicators: Indicator[];
    periodDate: Maybe<DatePeriod>;
    disabledFields: DisabledField[];
    canBeUpdated: boolean;
    shortName: string;
    indicatorMatching: Maybe<IndicatorMatch[]>;
};

export type OrgUnit = { id: Id; code: string; name: string; path: Id[] };
export type AccessData = { id: Id; permissions: Permissions; name: string; type: AccessType };
export type AccessType = "users" | "groups";

export type CoreCompetency = { id: Id; name: string; code: string };
export type DisabledField = {
    dataElementId: Id;
    optionComboId: Id;
    competencyId: Id;
    type: IndicatorType;
};

export class DataSet extends Struct<DataSetAttrs>() {
    validate(): ValidationError<DataSet>[] {
        return this.getValidationErrors();
    }

    private truncateValue(input: string): string {
        const targetLength = 50;
        return input.length > targetLength ? input.slice(0, targetLength) : input;
    }

    validateSetup(): ValidationError<DataSet>[] {
        const errors = this.buildSetupErrors();
        return errors.length === 0 ? [] : errors;
    }

    updateProject(project: Maybe<Project>, config: Config): DataSet {
        const name = project ? `${project.code} DataSet` : "";
        const shortName = this.truncateValue(name);
        const orgsUnits = project ? project.orgsUnits : this.orgUnits;

        const accessGroupsFromProject = this.getAccessFromProject(project, config);

        return this._update({
            access: accessGroupsFromProject,
            shortName,
            project,
            name,
            orgUnits: orgsUnits,
        });
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

    setIndicators(indicators: Indicator[]): DataSet {
        return this._update({ indicators });
    }

    validateIndicatorsStep(): ValidationError<DataSet>[] {
        return this.indicators.length === 0
            ? [
                  {
                      property: "indicators" as const,
                      errors: ["indicators_required"],
                      value: this.indicators,
                  },
              ]
            : [];
    }

    validateRegionCodes(): ValidationError<DataSet>[] {
        if (this.project) return [];

        const regionCodesFromOrgUnits = this.getRegionCodesFromAccess();

        return regionCodesFromOrgUnits.length > 0
            ? []
            : [
                  {
                      property: "access" as const,
                      errors: ["regions_required"],
                      value: this.access,
                  },
              ];
    }

    validateIndicatorMatching(): ValidationError<DataSet>[] {
        const property = "indicatorMatching" as const;
        const indicatorMap = new Set(this.indicators.map(indicator => indicator.id));
        return (
            this.indicatorMatching?.reduce((acc, { target, source }) => {
                if (!source) {
                    return acc.concat({
                        property,
                        errors: ["field_cannot_be_blank"],
                        value: "root indicator",
                    });
                } else if (!target) {
                    return acc.concat({
                        property,
                        errors: ["field_cannot_be_blank"],
                        value: "matched indicator",
                    });
                } else if (!indicatorMap.has(source)) {
                    return acc.concat({
                        property,
                        errors: ["not_found"],
                        value: `root indicator - ${source}`,
                    });
                } else if (!indicatorMap.has(target)) {
                    return acc.concat({
                        property,
                        errors: ["not_found"],
                        value: `matched indicator - ${target}`,
                    });
                }

                return acc;
            }, [] as ValidationError<DataSet>[]) || []
        );
    }

    getRegionCodesFromAccess(): string[] {
        return _(this.access)
            .filter(access => access.type === "groups")
            .compactMap(access => Project.extractCode(access.name))
            .uniq()
            .value();
    }

    updateShortName(): DataSet {
        const truncatedShortName = this.truncateValue(this.name);
        return this._update({ shortName: truncatedShortName });
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
        const indicatorsErrors = this.validateIndicatorsStep();
        const sharingErrors = this.validateRegionCodes();

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
        const orgsUnitsCodes = orgUnits.map(orgUnit => extractRegionCode(orgUnit.code));

        const regions = config.regions.filter(region => orgsUnitsCodes.includes(region.code));
        const regionsCodes = regions.map(region => region.code);

        const userGroups = config.userGroups.filter(userGroup =>
            regionsCodes.includes(userGroup.code)
        );

        return this.buildAccessGroups(userGroups);
    }

    private getAccessFromProject(project: Maybe<Project>, config: Config): AccessData[] {
        if (!project || !project.code) return [];

        const regionCodes = config.regions
            .filter(region => project.uniqueAccessCodes.includes(region.code))
            .map(region => region.code);

        const userGroups = config.userGroups.filter(userGroup =>
            regionCodes.includes(userGroup.code)
        );

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

    setDisabledFields(disabledFields: DataSetAttrs["disabledFields"]): DataSet {
        return this._update({ disabledFields });
    }

    static initial(id: Id, initialData: Partial<DataSetAttrs> = {}): DataSet {
        return DataSet.create({
            canBeUpdated: true,
            indicators: [],
            access: [],
            coreCompetencies: [],
            created: "",
            description: "",
            id,
            lastUpdated: "",
            name: "",
            shortName: "",
            orgUnits: [],
            permissions: {
                data: Permission.create({ read: false, write: false }),
                metadata: Permission.create({ read: false, write: false }),
            },
            project: undefined,
            expiryDays: 0,
            openFuturePeriods: 0,
            notifyUser: false,
            periodDate: undefined,
            disabledFields: [],
            indicatorMatching: undefined,
            ...initialData,
        });
    }

    hasPermissionsToUpdate(user: User): boolean {
        const dataSetList = DataSetList.create({ ...this });
        return dataSetList.hasPermissionsToUpdate(user);
    }
}
