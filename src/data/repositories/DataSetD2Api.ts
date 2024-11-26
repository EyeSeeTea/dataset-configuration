import { D2Api, MetadataPick } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import {
    AccessData,
    AccessType,
    CoreCompetency,
    DataSet,
    DataSetList,
    OrgUnit,
    Permissions,
} from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { Id } from "$/domain/entities/Ref";
import { Permission } from "$/domain/entities/Permission";
import _ from "$/domain/entities/generic/Collection";
import { Project } from "$/domain/entities/Project";
import { D2ApiCategoryOption } from "$/data/repositories/D2ApiCategoryOption";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiConfig";
import { Pager } from "@eyeseetea/d2-api/api";

export class DataSetD2Api {
    private d2ApiCategoryOption: D2ApiCategoryOption;
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api) {
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
                    },
                    filter: {
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
                    return {
                        id: d2DataSet.id,
                        name: d2DataSet.displayName,
                        lastUpdated: d2DataSet.lastUpdated,
                        permissions: {
                            data: this.buildPermission(d2DataSet.sharing.public, "data"),
                            metadata: this.buildPermission(d2DataSet.sharing.public, "metadata"),
                        },
                    };
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

        return DataSet.create({
            orgUnits: d2DataSet.organisationUnits
                ? d2DataSet.organisationUnits.map((ou): OrgUnit => {
                      return {
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
            shortName: d2DataSet.displayShortName,
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
        });
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

    private buildPermission(permissions: string, permissionType: "data" | "metadata"): Permission {
        if (permissionType === "metadata") {
            const { canRead, canWrite } = this.buildPermissionByType(permissions, permissionType);
            return Permission.create({ read: canRead, write: canWrite });
        } else if (permissionType === "data") {
            const { canWrite, canRead } = this.buildPermissionByType(permissions, permissionType);
            return Permission.create({ read: canRead, write: canWrite });
        } else {
            throw new Error("Invalid type");
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
}

export const dataSetFields = {
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
    sections: { id: true, displayName: true, code: true },
    userGroupAccesses: { id: true, displayName: true, access: true },
    userAccesses: { id: true, displayName: true, access: true },
    attributeValues: { value: true, attribute: { id: true } },
} as const;

export const dataSetFieldsWithOrgUnits = {
    ...dataSetFields,
    organisationUnits: { id: true, displayName: true, path: true },
};

type D2DataSetFields = MetadataPick<{
    dataSets: { fields: typeof dataSetFields };
}>["dataSets"][number];

type D2DataSet = { organisationUnits?: D2OrgUnit[] } & D2DataSetFields;
type D2OrgUnit = { id: Id; path: string; displayName: string };
export type OctalNotationPermission = string;
