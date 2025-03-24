import { D2Api, MetadataPick } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import {
    AccessData,
    AccessType,
    CoreCompetency,
    DataSet,
    DisabledField,
    OrgUnit,
} from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { Id } from "$/domain/entities/Ref";
import { Permission, Permissions } from "$/domain/entities/Permission";
import _ from "$/domain/entities/generic/Collection";
import { Project } from "$/domain/entities/Project";
import { D2ApiCategoryOption } from "$/data/repositories/D2ApiCategoryOption";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import { Pager } from "@eyeseetea/d2-api/api";
import { D2OrgUnit } from "$/data/repositories/OrgUnitD2Repository";
import { Indicator, indicatorTypes } from "$/domain/entities/Indicator";
import { Config } from "$/domain/entities/Config";
import { convertAttributeValueToDate, convertToCategories } from "$/data/utils";
import { COMMENT_SUFIX } from "$/domain/entities/DataElement";
import { PeriodDate } from "$/domain/entities/PeriodDate";
import { DataSetList } from "$/domain/entities/DataSetList";

export class DataSetD2Api {
    private d2ApiCategoryOption: D2ApiCategoryOption;
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api, private config: Config) {
        this.d2ApiCategoryOption = new D2ApiCategoryOption(this.api);
        this.d2ApiConfig = new D2ApiConfig(this.api);
    }

    getList(options: GetDataSetOptions): FutureData<Paginated<DataSetList>> {
        return this.getBaseData().flatMap(({ attributes }) => {
            return apiToFuture(
                this.api.models.dataSets.get({
                    fields: {
                        id: true,
                        displayName: true,
                        lastUpdated: true,
                        sharing: { public: true },
                        access: true,
                    },
                    filter: {
                        id: { in: options.filters.ids },
                        "attributeValues.attribute.id": { eq: attributes.createdByApp.id },
                        "attributeValues.value": { eq: "true" },
                        identifiable: { token: options.filters.search },
                    },
                    page: options.paging.page,
                    pageSize: options.paging.pageSize,
                    order: `${options.sorting.field}:${options.sorting.order}`,
                })
            ).map(d2Response => {
                const dataSets = d2Response.objects.map((d2DataSet): DataSetList => {
                    return DataSetList.create({
                        canBeUpdated: d2DataSet.access.update,
                        id: d2DataSet.id,
                        name: d2DataSet.displayName,
                        lastUpdated: d2DataSet.lastUpdated,
                        permissions: {
                            data: this.buildPermission(d2DataSet.sharing.public, "data"),
                            metadata: this.buildPermission(d2DataSet.sharing.public, "metadata"),
                        },
                    });
                });
                return { ...d2Response.pager, data: dataSets };
            });
        });
    }

    getWithOrgUnits(options: GetDataSetOptions): FutureData<Paginated<DataSet>> {
        return this.getBaseData().flatMap(({ attributes, coreCompetencies }) => {
            return this.getDataSetsWithOrgUnits(options, attributes, coreCompetencies);
        });
    }

    private buildDataSetsFromResponse(
        d2DataSets: D2DataSet[],
        attributes: D2Config["attributes"],
        coreCompetencies: CoreCompetency[],
        pager: Pager
    ): FutureData<Paginated<DataSet>> {
        const projectIds = this.getProjectIds(d2DataSets, attributes);
        return this.getProjectsByIds(projectIds).map(projects => {
            const dataSets = d2DataSets.map(d2DataSet => {
                return this.buildDataSet(d2DataSet, coreCompetencies, projects, attributes);
            });
            return { ...pager, data: dataSets };
        });
    }

    private getDataSetsWithOrgUnits(
        options: GetDataSetOptions,
        attributes: D2Config["attributes"],
        coreCompetencies: CoreCompetency[]
    ): FutureData<Paginated<DataSet>> {
        return apiToFuture(
            this.api.models.dataSets.get({
                pageSize: options.paging.pageSize,
                page: options.paging.page,
                filter: options.filters.projectsIds
                    ? {
                          "attributeValues.attribute.id": { eq: attributes.project.id },
                          "attributeValues.value": { in: options.filters.projectsIds },
                      }
                    : undefined,
                fields: dataSetFieldsWithOrgUnits,
            })
        ).flatMap(d2Response => {
            return this.buildDataSetsFromResponse(
                d2Response.objects,
                attributes,
                coreCompetencies,
                d2Response.pager
            );
        });
    }

    getProjectIds(d2DataSets: D2DataSet[], attributes: D2Config["attributes"]): Id[] {
        return _(d2DataSets)
            .compactMap(d2DataSet => {
                const projectAttribute = d2DataSet.attributeValues.find(
                    attribute => attribute.attribute.id === attributes.project.id
                );
                return projectAttribute?.value;
            })
            .value();
    }

    getBaseData(): FutureData<{
        attributes: D2Config["attributes"];
        coreCompetencies: CoreCompetency[];
    }> {
        return this.getConfig().flatMap(d2Config => {
            return this.getAllCompetencies(d2Config).map(coreCompetencies => {
                return { attributes: d2Config.attributes, coreCompetencies };
            });
        });
    }

    getConfig(): FutureData<D2Config> {
        return this.d2ApiConfig.get();
    }

    getProjectsByIds(ids: Id[]): FutureData<Project[]> {
        return this.d2ApiCategoryOption.getByIds(ids).map(categoryOptions => {
            return categoryOptions.map(categoryOption => {
                return Project.create({
                    id: categoryOption.id,
                    dataSets: [],
                    name: categoryOption.displayName,
                    lastUpdated: categoryOption.lastUpdated,
                    isOpen: false,
                    orgsUnits: [],
                    code: categoryOption.code,
                });
            });
        });
    }

    private getAllCompetencies(d2Config: D2Config): FutureData<CoreCompetency[]> {
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: {
                    id: true,
                    dataElementGroups: { id: true, displayName: true, code: true },
                },
                filter: { code: { eq: d2Config.dataElementGroupSets.coreCompetency.code } },
                paging: false,
            })
        ).flatMap(d2Response => {
            const degSet = d2Response.objects[0];
            if (!degSet) {
                return Future.error(
                    new Error(
                        `DataElementGroupSet with code ${d2Config.dataElementGroupSets.coreCompetency.code} not found`
                    )
                );
            }
            return Future.success(
                degSet.dataElementGroups.map(deg => {
                    return { id: deg.id, name: deg.displayName, code: deg.code };
                })
            );
        });
    }

    private buildDataElementsGroupsCodes(d2DataSet: D2DataSet): string[] {
        return _(d2DataSet.sections)
            .compactMap(section => {
                return this.extractCompetencyCode(section.id, section.code);
            })
            .uniq()
            .value();
    }

    buildDataSet(
        d2DataSet: D2DataSet,
        coreCompetencies: CoreCompetency[],
        projects: Project[],
        attributes: D2Config["attributes"]
    ): DataSet {
        const projectAttributeId = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === attributes.project.id
        )?.value;
        const projectDetails = projects.find(project => project.id === projectAttributeId);
        const dataElementGroups = this.buildDataElementsGroupsCodes(d2DataSet);

        const disabledFields = d2DataSet.sections.flatMap(section => {
            const degCode = this.extractCompetencyCode(section.id, section.code);
            const coreCompetency = coreCompetencies.find(cc => cc.code === degCode);
            const [_, type] = this.getSectionNameAndType(section.name);
            return section.greyedFields.map((greyField): DisabledField => {
                const indicatorType = indicatorTypes.find(it => it === type);
                if (!indicatorType) throw new Error(`Invalid indicator type: ${type}`);
                return {
                    type: indicatorType,
                    competencyId: coreCompetency?.id ?? "",
                    dataElementId: greyField.dataElement.id,
                    optionComboId: greyField.categoryOptionCombo.id,
                };
            });
        });

        return DataSet.create({
            canBeUpdated: d2DataSet.access.update,
            periodDate: this.buildPeriodDateFromAttributes(d2DataSet, attributes),
            indicators: this.buildIndicatorsFromDataSetElements(d2DataSet),
            orgUnits: d2DataSet.organisationUnits
                ? d2DataSet.organisationUnits.map((ou): OrgUnit => {
                      return {
                          code: ou.code,
                          id: ou.id,
                          name: ou.displayName,
                          path: ou.path.split("/").slice(1),
                      };
                  })
                : [],
            created: d2DataSet.created,
            description: d2DataSet.displayDescription,
            id: d2DataSet.id,
            name: d2DataSet.displayName,
            lastUpdated: d2DataSet.lastUpdated,
            permissions: {
                data: this.buildPermission(d2DataSet.sharing.public, "data"),
                metadata: this.buildPermission(d2DataSet.sharing.public, "metadata"),
            },
            access: this.buildAccessByType(d2DataSet.userAccesses, "users").concat(
                this.buildAccessByType(d2DataSet.userGroupAccesses, "groups")
            ),
            coreCompetencies: _(dataElementGroups)
                .compactMap(degCode => coreCompetencies.find(cc => cc.code === degCode))
                .value(),
            project: projectDetails ? projectDetails : undefined,
            notifyUser: d2DataSet.notifyCompletingUser,
            expiryDays: d2DataSet.expiryDays,
            openFuturePeriods: d2DataSet.openFuturePeriods,
            disabledFields: disabledFields,
        });
    }

    private buildPeriodDateFromAttributes(
        d2DataSet: D2DataSet,
        attributes: D2Config["attributes"]
    ): PeriodDate {
        const inputDate = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === attributes.inputDates.id
        );
        const periodDate = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === attributes.periodDates.id
        );

        const [startDate, endDate] = inputDate?.value.split("-") ?? ["", ""];

        return PeriodDate.create({
            startDate: startDate ? convertAttributeValueToDate(startDate) : "",
            endDate: endDate ? convertAttributeValueToDate(endDate) : "",
            periods: this.parsePeriodDateAttribute(periodDate?.value),
        });
    }

    private parsePeriodDateAttribute(periodDate: Maybe<string>): PeriodDate["periods"] {
        const splitPeriodsDates = periodDate?.split(",") ?? [];
        return _(splitPeriodsDates)
            .compactMap(period => {
                const [year, dates] = period.split("=");
                if (!year || !dates) return undefined;
                const [startDate, endDate] = dates.split("-") ?? ["", ""];
                if (!startDate || !endDate) return undefined;
                return {
                    year: Number(year),
                    startDate: convertAttributeValueToDate(startDate),
                    endDate: convertAttributeValueToDate(endDate),
                };
            })
            .value();
    }

    private buildIndicatorsFromDataSetElements(d2DataSet: D2DataSet): Indicator[] {
        const outputsIndicators = this.buildOutputsIndicators(d2DataSet);

        const outcomesIndicators = this.buildOutcomesIndicators(d2DataSet);

        return outputsIndicators.concat(outcomesIndicators);
    }

    private buildAccessByType(
        accessData: Array<{ id: Id; displayName: string; access: OctalNotationPermission }>,
        type: AccessType
    ): AccessData[] {
        return accessData.map((access): AccessData => {
            return {
                id: access.id,
                name: access.displayName,
                permissions: {
                    data: this.buildPermission(access.access, "data"),
                    metadata: this.buildPermission(access.access, "metadata"),
                },
                type,
            };
        });
    }

    private extractCompetencyCode(sectionId: Id, sectionCode: string): Maybe<string> {
        if (!sectionCode) {
            console.error(`Section has not code: ${sectionId}`);
            return undefined;
        }
        const [_prefix, _type, ...ccCodeParts] = sectionCode.split("_");
        return ccCodeParts.join("_");
    }

    buildPermission(permissions: string, permissionType: "data" | "metadata"): Permission {
        switch (permissionType) {
            case "metadata": {
                const { canRead, canWrite } = this.buildPermissionByType(
                    permissions,
                    permissionType
                );
                return Permission.create({ read: canRead, write: canWrite });
            }
            case "data": {
                const { canWrite, canRead } = this.buildPermissionByType(
                    permissions,
                    permissionType
                );
                return Permission.create({ read: canRead, write: canWrite });
            }
        }
    }

    private buildPermissionByType(permissions: string, permissionType: "data" | "metadata") {
        const initialIndex = permissionType === "metadata" ? 0 : 2;
        const canRead = permissions[initialIndex] === "r";
        const canWrite = permissions[initialIndex + 1] === "w";
        return { canRead, canWrite };
    }

    private convertPermissionToOctal(permission: Permission): OctalNotationPermission {
        return permission.noAccess()
            ? "--"
            : [permission.read ? "r" : "-", permission.write ? "w" : "-"].join("");
    }

    generateFullPermission(permissions: Permissions): OctalNotationPermission {
        return [
            this.convertPermissionToOctal(permissions.metadata),
            this.convertPermissionToOctal(permissions.data),
            "----",
        ].join("");
    }

    private buildOutputsIndicators(d2DataSet: D2DataSet) {
        return _(d2DataSet.dataSetElements)
            .compactMap(dataSetElement => {
                const indicator = this.config.indicators.find(
                    indicator => indicator.id === dataSetElement.dataElement.id
                );
                if (!indicator) return undefined;
                const categoryCombo = dataSetElement.categoryCombo;
                const categories = convertToCategories(
                    categoryCombo ? categoryCombo.categories : []
                );

                return Indicator.create({
                    ...indicator,
                    disaggregation: categoryCombo
                        ? {
                              id: categoryCombo.id,
                              name: categoryCombo.displayName,
                              categories: categories,
                              optionsCombos: categoryCombo.categoryOptionCombos.map(
                                  optionCombo => ({
                                      id: optionCombo.id,
                                      name: optionCombo.displayName,
                                      categoryCombo: { id: "" },
                                      options: [],
                                  })
                              ),
                          }
                        : indicator.disaggregation,
                });
            })
            .value();
    }

    private buildOutcomesIndicators(d2DataSet: D2DataSet) {
        return _(d2DataSet.indicators)
            .compactMap(d2Indicator => {
                const indicator = this.config.indicators.find(
                    indicator => indicator.id === d2Indicator.id
                );

                if (!indicator) return undefined;

                const dataElementsRefs = Indicator.extractDataElementsReferences(indicator);

                const commentsDataElements = d2DataSet.dataSetElements.filter(dataElement =>
                    dataElementsRefs.includes(dataElement.dataElement.code)
                );
                const relatedDataElements = d2DataSet.dataSetElements.filter(dataElement =>
                    dataElementsRefs.includes(dataElement.dataElement.id)
                );

                return Indicator.create({
                    ...indicator,
                    relatedDataElements: relatedDataElements
                        .concat(commentsDataElements)
                        .map(dataElement => {
                            const disaggregation = dataElement.categoryCombo
                                ? this.buildDisaggregation(dataElement.categoryCombo)
                                : this.buildDisaggregation(dataElement.dataElement.categoryCombo);

                            return {
                                valueType: dataElement.dataElement.valueType,
                                description: dataElement.dataElement.displayDescription,
                                id: dataElement.dataElement.id,
                                name: dataElement.dataElement.displayName,
                                code: dataElement.dataElement.code,
                                isComment: dataElement.dataElement.code.endsWith(COMMENT_SUFIX),
                                disaggregation: disaggregation,
                                initialDisaggregation: disaggregation,
                                categories: [],
                            };
                        }),
                });
            })
            .value();
    }

    private buildDisaggregation(
        categoryCombo: D2DataSet["dataSetElements"][number]["categoryCombo"]
    ) {
        return {
            id: categoryCombo.id,
            name: categoryCombo.displayName,
            categories: convertToCategories(categoryCombo.categories),
            optionsCombos: categoryCombo.categoryOptionCombos.map(optionCombo => ({
                id: optionCombo.id,
                name: optionCombo.displayName,
                categoryCombo: { id: "" },
                options: [],
            })),
        };
    }

    getSectionNameAndType(sectionName: string) {
        const lastSpaceIndex = sectionName.lastIndexOf(" ");
        const name = sectionName.slice(0, lastSpaceIndex);
        const type = sectionName.slice(lastSpaceIndex + 1).toLowerCase();
        return [name, type];
    }
}

export const categoryComboFields = {
    id: true,
    displayName: true,
    categories: {
        id: true,
        name: true,
        displayName: true,
        categoryOptions: { id: true, displayName: true },
    },
    categoryOptionCombos: { id: true, displayName: true },
} as const;

export const dataSetFields = {
    access: true,
    created: true,
    displayDescription: true,
    displayName: true,
    expiryDays: true,
    openFuturePeriods: true,
    notifyCompletingUser: true,
    id: true,
    lastUpdated: true,
    sharing: { public: true },
    displayShortName: true,
    sections: {
        id: true,
        name: true,
        displayName: true,
        code: true,
        greyedFields: {
            dataElement: true,
            categoryOptionCombo: true,
        },
    },
    userGroupAccesses: { id: true, displayName: true, access: true },
    userAccesses: { id: true, displayName: true, access: true },
    attributeValues: { value: true, attribute: { id: true } },
    indicators: { id: true, numerator: true, denominator: true, code: true },
    dataSetElements: {
        dataElement: {
            id: true,
            displayDescription: true,
            displayName: true,
            code: true,
            categoryCombo: categoryComboFields,
            valueType: true,
        },
        categoryCombo: categoryComboFields,
    },
} as const;

export const dataSetFieldsWithOrgUnits = {
    ...dataSetFields,
    organisationUnits: { id: true, code: true, displayName: true, path: true },
};

type D2DataSetFields = MetadataPick<{
    dataSets: { fields: typeof dataSetFields };
}>["dataSets"][number];

type D2DataSet = { organisationUnits?: D2OrgUnit[] } & D2DataSetFields;
export type OctalNotationPermission = string;
