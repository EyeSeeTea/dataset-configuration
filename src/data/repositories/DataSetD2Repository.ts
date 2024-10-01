import { D2Api, MetadataPick } from "../../types/d2-api";
import { FutureData, apiToFuture } from "$/data/api-futures";
import { AccessData, AccessType, CoreCompetency, DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetRepository, GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { Future } from "$/domain/entities/generic/Future";
import _ from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";
import { Id, OctalNotationPermission } from "$/domain/entities/Ref";
import { getUid } from "$/utils/uid";
import { Permission } from "$/domain/entities/Permission";

export class DataSetD2Repository implements DataSetRepository {
    constructor(private api: D2Api) {}

    get(options: GetDataSetOptions): FutureData<Paginated<DataSet>> {
        return this.getBaseData().flatMap(({ attributeData, coreCompetencies }) => {
            return apiToFuture(
                this.api.models.dataSets.get({
                    pageSize: options.paging.pageSize,
                    page: options.paging.page,
                    filter: {
                        "attributeValues.attribute.id": { eq: attributeData.id },
                        "attributeValues.value": { eq: "true" },
                        identifiable: { token: options.filters.search },
                        id: { in: options.filters.ids },
                    },
                    fields: dataSetFields,
                    order: `${options.sorting.field}:${options.sorting.order}`,
                })
            ).map(d2Response => {
                const dataSets = d2Response.objects.map(d2DataSet => {
                    return this.buildDataSet(d2DataSet, coreCompetencies);
                });
                return { ...d2Response.pager, data: dataSets };
            });
        });
    }

    getByIds(ids: string[]): FutureData<DataSet[]> {
        if (ids.length === 0) return Future.success([]);
        return this.getBaseData().flatMap(({ attributeData, coreCompetencies }) => {
            const $requests = Future.sequential(
                _(ids)
                    .chunk(50)
                    .map(dataSetIds => {
                        return apiToFuture(
                            this.api.models.dataSets.get({
                                paging: false,
                                filter: {
                                    "attributeValues.attribute.id": { eq: attributeData.id },
                                    "attributeValues.value": { eq: "true" },
                                    id: { in: dataSetIds },
                                },
                                fields: {
                                    ...dataSetFields,
                                    organisationUnits: { id: true, displayName: true, path: true },
                                },
                            })
                        );
                    })
                    .value()
            );

            return $requests.map(d2Response => {
                const allDataSets = d2Response.flatMap(d2Response => d2Response.objects);
                const dataSets = allDataSets.map(d2DataSet => {
                    return this.buildDataSet(d2DataSet, coreCompetencies);
                });
                return dataSets;
            });
        });
    }

    save(dataSets: DataSet[]): FutureData<void> {
        if (dataSets.length === 0) return Future.success(undefined);
        const dataSetsIds = dataSets.map(dataSet => dataSet.id);

        const $requests = Future.sequential(
            _(dataSetsIds)
                .chunk(50)
                .map(dataSetIds => {
                    return apiToFuture(
                        this.api.models.dataSets.get({
                            fields: { $owner: true },
                            filter: { id: { in: dataSetIds } },
                            paging: false,
                        })
                    ).flatMap(d2Response => {
                        const dataSetsToSave = dataSetIds.map(dataSetId => {
                            const existingDataSet = d2Response.objects.find(
                                ds => ds.id === dataSetId
                            );
                            const dataSet = dataSets.find(dataSet => dataSet.id === dataSetId);
                            if (!dataSet) {
                                throw Error(`Cannot find dataSet: ${dataSetId}`);
                            }

                            const result = {
                                ...(existingDataSet || {}),
                                ...this.buildD2DataSet(dataSet),
                            };
                            delete result.sharing;
                            return result;
                        });

                        return apiToFuture(this.api.metadata.post({ dataSets: dataSetsToSave }));
                    });
                })
                .value()
        );

        return $requests.toVoid();
    }

    remove(ids: string[]): FutureData<void> {
        if (ids.length === 0) return Future.success(undefined);
        const $requests = Future.sequential(
            _(ids)
                .chunk(50)
                .map(dataSetIds => {
                    return apiToFuture(
                        this.api.metadata.post(
                            {
                                dataSets: dataSetIds.map(id => ({ id })),
                            },
                            {
                                importStrategy: "DELETE",
                            }
                        )
                    );
                })
                .value()
        );

        return $requests.toVoid();
    }

    private getBaseData(): FutureData<{
        attributeData: { id: Id };
        coreCompetencies: CoreCompetency[];
    }> {
        const attributeCode = "GL_CREATED_BY_DATASET_CONFIGURATION";
        return Future.joinObj({
            attributeData: this.getAttributeByCode(attributeCode),
            coreCompetencies: this.getAllCompetencies(),
        });
    }

    private buildD2DataSet(dataSet: DataSet) {
        return {
            id: dataSet.id || getUid(dataSet.name),
            name: dataSet.name,
            description: dataSet.description,
            shortName: dataSet.shortName,
            publicAccess: DataSet.generateFullPermission(dataSet),
            userAccesses: _(dataSet.access)
                .map(access => {
                    if (access.type !== "users") return undefined;
                    return { access: access.value, id: access.id, displayName: access.name };
                })
                .compact()
                .value(),
            userGroupAccesses: _(dataSet.access)
                .map(access => {
                    if (access.type !== "groups") return undefined;
                    return { access: access.value, id: access.id, displayName: access.name };
                })
                .compact()
                .value(),
            organisationUnits: dataSet.orgUnits.map(ou => ({ id: ou.id })),
        };
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

    private getAttributeByCode(code: string): FutureData<{ id: string }> {
        return apiToFuture(
            this.api.models.attributes.get({
                fields: { id: true },
                filter: { code: { eq: code } },
            })
        ).flatMap(d2Response => {
            const d2Attribute = d2Response.objects[0];
            if (!d2Attribute) {
                return Future.error(new Error(`Attribute with code ${code} not found`));
            }
            return Future.success({ id: d2Attribute.id });
        });
    }

    private buildDataSet(d2DataSet: D2DataSet, coreCompetencies: CoreCompetency[]): DataSet {
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

const dataSetFields = {
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
} as const;

type D2DataSetFields = MetadataPick<{
    dataSets: { fields: typeof dataSetFields };
}>["dataSets"][number];

type D2DataSet = { organisationUnits?: D2OrgUnit[] } & D2DataSetFields;
type D2OrgUnit = { id: Id; path: string; displayName: string };
