import { D2Api, MetadataPick } from "$/types/d2-api";
import { FutureData, apiToFuture } from "$/data/api-futures";
import { AccessData, AccessType, CoreCompetency, DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { Future } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { Id, OctalNotationPermission, Ref } from "$/domain/entities/Ref";
import { Permission } from "$/domain/entities/Permission";
import _ from "$/domain/entities/generic/Collection";
import { Project } from "$/domain/entities/Project";
import { D2ApiCategoryOption } from "$/data/repositories/D2ApiCategoryOption";
import { MetadataItem } from "$/domain/entities/MetadataItem";

export class DataSetD2Api {
    private d2ApiCategoryOption: D2ApiCategoryOption;
    constructor(private api: D2Api, private metadata: MetadataItem) {
        this.d2ApiCategoryOption = new D2ApiCategoryOption(this.api);
    }

    get(options: D2DataSetOptions): FutureData<Paginated<DataSet>> {
        return this.getBaseData({ projectsIds: options.filters.projectsIds }).flatMap(
            ({ coreCompetencies }) => {
                const attributesToFilter = options.filters.projectsIds
                    ? [this.metadata.attributes.project.id]
                    : [this.metadata.attributes.createdByApp.id];
                return apiToFuture(
                    this.api.models.dataSets.get({
                        pageSize: options.paging.pageSize,
                        page: options.paging.page,
                        filter: {
                            "attributeValues.attribute.id": { in: attributesToFilter },
                            "attributeValues.value": this.isProjectFilterPresent(options)
                                ? { in: [...this.getOrThrow(options.filters.projectsIds)] }
                                : { eq: "true" },
                            identifiable: { token: options.filters.search },
                            id: { in: options.filters.ids },
                        },
                        fields: {
                            ...dataSetFields,
                            ...(options.includeOrgUnits
                                ? {
                                      organisationUnits: {
                                          id: true,
                                          path: true,
                                          displayName: true,
                                      },
                                  }
                                : {}),
                        },
                        order: `${options.sorting.field}:${options.sorting.order}`,
                    })
                ).flatMap(d2Response => {
                    const projectIds = this.getProjectIds(d2Response.objects);
                    return this.getProjectsByIds(projectIds).map(projects => {
                        const dataSets = d2Response.objects.map(d2DataSet => {
                            return this.buildDataSet(d2DataSet, coreCompetencies, projects);
                        });
                        return { ...d2Response.pager, data: dataSets };
                    });
                });
            }
        );
    }

    private getProjectIds(d2DataSets: D2DataSet[]): Id[] {
        return _(d2DataSets)
            .map(d2DataSet => {
                const projectAttribute = d2DataSet.attributeValues.find(
                    attribute => attribute.attribute.id === this.metadata.attributes.project.id
                );
                return projectAttribute ? projectAttribute.value : undefined;
            })
            .compact()
            .value();
    }

    getBaseData(options: { projectsIds: Maybe<Id[]> }): FutureData<{
        attributeData: Ref[];
        coreCompetencies: CoreCompetency[];
    }> {
        const { projectsIds: projectId } = options;
        return Future.joinObj({
            attributeData: this.getAttributesByCodes({ includeProject: Boolean(projectId) }),
            coreCompetencies: this.getAllCompetencies(),
        });
    }

    private getProjectsByIds(ids: Id[]): FutureData<Project[]> {
        return this.d2ApiCategoryOption.getByIds(ids).map(categoryOptions => {
            return categoryOptions.map(categoryOption => {
                return Project.create({
                    id: categoryOption.id,
                    dataSets: [],
                    name: categoryOption.displayName,
                    lastUpdated: categoryOption.lastUpdated,
                });
            });
        });
    }

    private isProjectFilterPresent(options: GetDataSetOptions): boolean {
        return Boolean(options.filters.projectsIds);
    }

    private getOrThrow<T>(value: Maybe<T>): T {
        if (!value) throw new Error("Value not found");
        return value;
    }

    private getAllCompetencies(): FutureData<CoreCompetency[]> {
        const dataElementGroupCode = "GL_CoreComp_DEGROUPSET";
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: {
                    id: true,
                    dataElementGroups: { id: true, displayName: true, code: true },
                },
                filter: { code: { eq: dataElementGroupCode } },
                paging: false,
            })
        ).flatMap(d2Response => {
            const degSet = d2Response.objects[0];
            if (!degSet) {
                return Future.error(
                    new Error(`DataElementGroupSet with code ${dataElementGroupCode} not found`)
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
        const dataElementsGroupsCodes = _(d2DataSet.sections)
            .map((section): Maybe<string> => {
                return this.extractCompentencyCode(section.id, section.code);
            })
            .compact()
            .value();

        return _(dataElementsGroupsCodes).uniq().value();
    }

    private getAttributesByCodes(options: { includeProject: boolean }): FutureData<Ref[]> {
        const attributeCreatedByAppCode = this.metadata.attributes.createdByApp.code;
        const attributeCodeProject = this.metadata.attributes.project.code;
        const attributesCodes = options.includeProject
            ? [attributeCodeProject]
            : [attributeCreatedByAppCode];

        return apiToFuture(
            this.api.models.attributes.get({
                fields: { id: true },
                filter: { code: { in: attributesCodes } },
                paging: false,
            })
        ).flatMap(d2Response => {
            const notEnoughAttributes = d2Response.objects.length !== attributesCodes.length;
            if (notEnoughAttributes) {
                return Future.error(
                    new Error(`Attributes: ${attributesCodes.join(", ")} not found`)
                );
            }
            return Future.success(d2Response.objects.map(d2Attribute => ({ id: d2Attribute.id })));
        });
    }

    buildDataSet(
        d2DataSet: D2DataSet,
        coreCompetencies: CoreCompetency[],
        projects: Project[]
    ): DataSet {
        const projectAttributeId = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === this.metadata.attributes.project.id
        )?.value;
        const projectDetails = projects.find(project => project.id === projectAttributeId);
        const dataElementGroups = this.buildDataElementsGroupsCodes(d2DataSet);
        return DataSet.create({
            orgUnits: d2DataSet.organisationUnits
                ? d2DataSet.organisationUnits.map(ou => {
                      return {
                          id: ou.id,
                          name: ou.displayName,
                          paths: ou.path.split("/").slice(1),
                      };
                  })
                : [],
            created: d2DataSet.created,
            description: d2DataSet.displayDescription,
            id: d2DataSet.id,
            name: d2DataSet.displayName,
            lastUpdated: d2DataSet.lastUpdated,
            dataPermissions: this.buildPermission(d2DataSet.sharing.public, "data"),
            metadataPermissions: this.buildPermission(d2DataSet.sharing.public, "metadata"),
            shortName: d2DataSet.displayShortName,
            access: this.buildAccessByType(d2DataSet.userAccesses, "users").concat(
                this.buildAccessByType(d2DataSet.userGroupAccesses, "groups")
            ),
            coreCompetencies: _(dataElementGroups)
                .map(degCode => {
                    const compentency = coreCompetencies.find(cc => cc.code === degCode);
                    if (!compentency) return undefined;
                    return { id: compentency.id, name: compentency.name, code: compentency.code };
                })
                .compact()
                .value(),
            project: projectDetails ? projectDetails : undefined,
        });
    }

    private buildAccessByType(
        accessData: Array<{ id: Id; displayName: string; access: OctalNotationPermission }>,
        type: AccessType
    ): AccessData[] {
        return accessData.map((access): AccessData => {
            return { id: access.id, name: access.displayName, value: access.access, type };
        });
    }

    private extractCompentencyCode(sectionId: Id, sectionCode: string): string {
        if (!sectionCode) {
            console.error(`Section has not code: ${sectionId}`);
            return "";
        }
        const [_prefix, _type, ...ccCodeParts] = sectionCode.split("_");
        return ccCodeParts.join("_");
    }

    private buildPermission(permissions: string, permissionType: "data" | "metadata"): Permission {
        if (permissionType === "metadata") {
            const { canRead, canWrite } = this.buildPermissionByType(permissions, permissionType);
            return { canRead, canWrite, noAccess: !canWrite && !canRead };
        } else if (permissionType === "data") {
            const { canWrite, canRead } = this.buildPermissionByType(permissions, permissionType);
            return { canRead, canWrite, noAccess: !canWrite && !canRead };
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
}

export const dataSetFields = {
    created: true,
    displayDescription: true,
    displayName: true,
    id: true,
    lastUpdated: true,
    sharing: { public: true },
    displayShortName: true,
    sections: { id: true, displayName: true, code: true },
    userGroupAccesses: { id: true, displayName: true, access: true },
    userAccesses: { id: true, displayName: true, access: true },
    attributeValues: { value: true, attribute: { id: true } },
} as const;

type D2DataSetFields = MetadataPick<{
    dataSets: { fields: typeof dataSetFields };
}>["dataSets"][number];

type D2DataSet = { organisationUnits?: D2OrgUnit[] } & D2DataSetFields;
type D2OrgUnit = { id: Id; path: string; displayName: string };
type D2DataSetOptions = GetDataSetOptions & { includeOrgUnits?: boolean };
