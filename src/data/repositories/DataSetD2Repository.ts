import { D2AttributeValue } from "@eyeseetea/d2-api/2.36";
import { D2Api, MetadataResponse } from "$/types/d2-api";

import { apiToFuture } from "$/data/api-futures";
import { AccessData, DataSet, DataSetList } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import {
    DataSetName,
    DataSetRepository,
    GetDataSetOptions,
} from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { getUid } from "$/utils/uid";
import _ from "$/domain/entities/generic/Collection";
import {
    DataSetD2Api,
    OctalNotationPermission,
    dataSetFieldsWithOrgUnits,
} from "$/data/repositories/DataSetD2Api";
import { Maybe } from "$/utils/ts-utils";
import { chunkRequest } from "$/data/utils";
import { D2Config } from "$/data/repositories/D2ApiConfig";
import { Indicator } from "$/domain/entities/Indicator";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";

export class DataSetD2Repository implements DataSetRepository {
    private d2DataSetApi: DataSetD2Api;

    constructor(private api: D2Api) {
        this.d2DataSetApi = new DataSetD2Api(this.api);
    }

    getByName(name: string): FutureData<DataSetName[]> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: { id: true, name: true },
                filter: { name: { $ilike: name } },
                paging: false,
            })
        ).map(response => response.objects);
    }

    getList(options: GetDataSetOptions): FutureData<Paginated<DataSetList>> {
        return this.d2DataSetApi.getList(options);
    }

    getAll(): FutureData<DataSet[]> {
        return this.getAllDataSets(1, []);
    }

    private getAllDataSets(initialPage: number, dataSets: DataSet[]): FutureData<DataSet[]> {
        return this.getDataSets(initialPage, 100).flatMap(response => {
            const newDataSets = [...dataSets, ...response.data];
            if (response.page >= response.pageCount) {
                return Future.success(newDataSets);
            } else {
                return this.getAllDataSets(initialPage + 1, newDataSets);
            }
        });
    }

    private getDataSets(page: number, pageSize: number) {
        return this.d2DataSetApi.getWithOrgUnits({
            paging: { page, pageSize },
            filters: {},
            sorting: { field: "name", order: "asc" },
        });
    }

    getByIds(ids: string[]): FutureData<DataSet[]> {
        if (ids.length === 0) return Future.success([]);

        return this.d2DataSetApi.getBaseData().flatMap(({ attributes, coreCompetencies }) => {
            const $requests = chunkRequest(ids, dataSetIds => {
                return apiToFuture(
                    this.api.models.dataSets.get({
                        paging: false,
                        filter: {
                            "attributeValues.attribute.id": { in: [attributes.createdByApp.id] },
                            "attributeValues.value": { eq: "true" },
                            id: { in: dataSetIds },
                        },
                        fields: dataSetFieldsWithOrgUnits,
                    })
                ).map(d2Response => d2Response.objects);
            });

            return $requests.flatMap(allDataSets => {
                const projectIds = this.d2DataSetApi.getProjectIds(allDataSets, attributes);
                return this.d2DataSetApi.getProjectsByIds(projectIds).map(projects => {
                    return allDataSets.map(d2DataSet => {
                        return this.d2DataSetApi.buildDataSet(
                            d2DataSet,
                            coreCompetencies,
                            projects,
                            attributes
                        );
                    });
                });
            });
        });
    }

    save(dataSets: DataSetToSave[]): FutureData<void> {
        if (dataSets.length === 0) return Future.success(undefined);
        const ids = dataSets.map(dataSet => dataSet.id);

        return this.d2DataSetApi.getConfig().flatMap(config => {
            const $requests = chunkRequest<string[]>(ids, dataSetIds => {
                return apiToFuture(
                    this.api.models.dataSets.get({
                        fields: { $owner: true },
                        filter: { id: { in: dataSetIds } },
                        paging: false,
                    })
                ).flatMap(d2Response => {
                    const dataSetsToSave = dataSetIds.map(dataSetId => {
                        const existingDataSet = d2Response.objects.find(ds => ds.id === dataSetId);
                        const dataSet = dataSets.find(dataSet => dataSet.id === dataSetId);
                        if (!dataSet) {
                            throw Error(`Cannot find dataSet: ${dataSetId}`);
                        }

                        const existingAttributes = existingDataSet?.attributeValues;

                        const result = {
                            ...(existingDataSet || {}),
                            ...this.buildD2DataSet(dataSet, existingAttributes, config.attributes),
                        };

                        const { sharing: _, ...rest } = result;
                        return rest;
                    });

                    return apiToFuture(
                        this.api.metadata.post({ dataSets: dataSetsToSave })
                    ).flatMap(response => {
                        const allErrors = this.extractErrorsFromResponse(response);

                        if (allErrors.length > 0)
                            return Future.error(new Error(allErrors.join("\n")));

                        return this.saveAllSections(dataSetsToSave, dataSets).map(() => []);
                    });
                });
            });

            return $requests.toVoid();
        });
    }

    delete(ids: string[]): FutureData<void> {
        if (ids.length === 0) return Future.success(undefined);

        const $requests = chunkRequest<void>(ids, dataSetIds => {
            return apiToFuture(
                this.api.metadata.post(
                    { dataSets: dataSetIds.map(id => ({ id })) },
                    { importStrategy: "DELETE" }
                )
            ).flatMap(response => {
                const allErrors = this.extractErrorsFromResponse(response);
                if (allErrors.length > 0) return Future.error(new Error(allErrors.join("\n")));
                return Future.success([]);
            });
        });

        return $requests.toVoid();
    }

    private saveAllSections(dataSetsToSave: Ref[], dataSets: DataSetToSave[]): FutureData<void> {
        const dataSetsIds = dataSetsToSave.map(dataSet => dataSet.id);

        return this.getSectionsByIds(dataSetsIds).flatMap(sections => {
            const sectionsActions = dataSetsToSave.flatMap(dataSetSaved => {
                const dataSet = dataSets.find(dataSet => dataSet.id === dataSetSaved.id);
                const sectionsToSave = this.buildDataSetSections(
                    dataSet?.indicators || [],
                    dataSetSaved.id
                );
                const existingSectionByDataSet = sections.filter(
                    section => section.dataSet.id === dataSetSaved.id
                );
                const sectionsIdsToSave = new Set(sectionsToSave.map(section => section.id));
                const idsToDelete = existingSectionByDataSet.filter(
                    item => !sectionsIdsToSave.has(item.id)
                );

                return { toSave: sectionsToSave, toDelete: idsToDelete };
            });

            const sectionsToDelete = sectionsActions.flatMap(sectionAction =>
                sectionAction.toDelete.map(item => ({ id: item.id }))
            );

            return this.deleteSections(sectionsToDelete).flatMap(() => {
                const sectionsToSave = sectionsActions.flatMap(
                    sectionAction => sectionAction.toSave
                );
                return apiToFuture(this.api.metadata.post({ sections: sectionsToSave })).flatMap(
                    sectionResponse => {
                        const allErrors = this.extractErrorsFromResponse(sectionResponse);
                        if (allErrors.length > 0)
                            return Future.error(new Error(allErrors.join("\n")));
                        return Future.success(undefined);
                    }
                );
            });
        });
    }

    private deleteSections(ids: Ref[]): FutureData<void> {
        if (ids.length === 0) return Future.success(undefined);
        return apiToFuture(
            this.api.metadata.post({ sections: ids }, { importStrategy: "DELETE" })
        ).toVoid();
    }

    private getSectionsByIds(ids: Id[]) {
        if (ids.length === 0) return Future.success([]);
        return chunkRequest(ids, dataSetIds => {
            return apiToFuture(
                this.api.models.sections.get({
                    fields: { $owner: true },
                    filter: { "dataSet.id": { in: dataSetIds } },
                    paging: false,
                })
            ).map(response => response.objects);
        }).map(sections => sections.flatMap(section => section));
    }

    private extractErrorsFromResponse(response: MetadataResponse) {
        return response.typeReports.flatMap(typeReport =>
            typeReport.objectReports.flatMap(objectReport =>
                objectReport.errorReports.flatMap(errorReport => errorReport.message)
            )
        );
    }

    private buildDataSetSections(indicators: Indicator[], id: string): D2DataSetSection[] {
        return _(indicators)
            .groupBy(indicator => `${indicator.type}_${indicator.coreCompetency.code}`)
            .mapValues(([indicatorType, indicators]): D2DataSetSection => {
                const [type, _sectionGroupCode] = indicatorType.split("_");
                const coreCompetency = indicators[0]?.coreCompetency;
                if (!coreCompetency || !type)
                    throw Error(`Cannot find core competency name for ${indicatorType}`);

                const typeLabel = this.getIndicatorTypeName(type);
                const code = `${id}_${typeLabel.toUpperCase()}_${coreCompetency.code}`;

                const indicatorOutComes = indicators.filter(
                    indicator => indicator.type === "outcomes"
                );

                const relatedDataElements = indicatorOutComes.flatMap(
                    indicator => indicator.relatedDataElements
                );

                const refDataElements = relatedDataElements.map(dataElement => ({
                    id: dataElement.id,
                }));

                return {
                    id: getUid(code),
                    code,
                    dataSet: { id: id },
                    name: `${coreCompetency.name} ${typeLabel}`,
                    greyedFields: [],
                    dataElements: indicators
                        .filter(x => x.type === "outputs")
                        .map(indicator => ({ id: indicator.id }))
                        .concat(refDataElements),
                    indicators: indicatorOutComes.map(indicator => ({ id: indicator.id })),
                };
            })
            .values();
    }

    private buildD2DataSet(
        dataSet: DataSetToSave,
        existingAttributes: Maybe<D2AttributeValue[]>,
        attributes: D2Config["attributes"]
    ) {
        return {
            id: dataSet.id || getUid(dataSet.name),
            shortName: dataSet.shortName,
            name: dataSet.name,
            periodType: "Monthly",
            description: dataSet.description,
            publicAccess: this.d2DataSetApi.generateFullPermission(dataSet.permissions),
            dataSetElements: this.buildDataSetElements(dataSet),
            indicators: dataSet.indicators
                .filter(indicator => indicator.type === "outcomes")
                .map(indicator => ({ id: indicator.id })),
            userAccesses: dataSet.access
                .filter(access => access.type === "users")
                .map(access => {
                    return {
                        access: this.d2DataSetApi.generateFullPermission(access.permissions),
                        id: access.id,
                        displayName: access.name,
                    };
                }),
            userGroupAccesses: _(dataSet.access)
                .filter(access => access.type === "groups")
                .map(access => {
                    return {
                        access: this.d2DataSetApi.generateFullPermission(access.permissions),
                        id: access.id,
                        displayName: access.name,
                    };
                })
                .value(),
            organisationUnits: dataSet.orgUnits.map(ou => ({ id: ou.id })),
            attributeValues: this.buildD2Attributes(existingAttributes, dataSet, attributes),
            notifyCompletingUser: dataSet.notifyUser,
            openFuturePeriods: dataSet.openFuturePeriods,
            expiryDays: dataSet.expiryDays,
        };
    }

    private convertSharingGroupsToAccessData(d2UserGroups: Maybe<SharingUserGroup>): AccessData[] {
        if (!d2UserGroups || Object.keys(d2UserGroups).length === 0) return [];

        return Object.values(d2UserGroups).map(({ id, access }) => ({
            id,
            permissions: {
                data: this.d2DataSetApi.buildPermission(access, "data"),
                metadata: this.d2DataSetApi.buildPermission(access, "metadata"),
            },
            name: "",
            type: "groups",
        }));
    }

    private buildDataSetElements(dataSet: DataSetToSave) {
        const relatedDataElements = dataSet.indicators
            .filter(indicator => indicator.type === "outcomes")
            .flatMap(indicator => indicator.relatedDataElements)
            .map(dataElement => {
                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id: dataElement.id },
                    categoryOptionCombo: dataElement.disaggregation
                        ? { id: dataElement.disaggregation.id }
                        : undefined,
                };
            });

        const selectedIndicators = dataSet.indicators
            .filter(indicator => indicator.type === "outputs")
            .map(indicator => ({
                dataSet: { id: dataSet.id },
                dataElement: { id: indicator.id },
                categoryOptionCombo: indicator.disaggregation
                    ? { id: indicator.disaggregation.id }
                    : undefined,
            }));

        return relatedDataElements.concat(selectedIndicators);
    }

    private buildD2Attributes(
        existingAttributes: Maybe<D2AttributeValue[]>,
        dataSet: DataSetToSave,
        attributes: D2Config["attributes"]
    ) {
        const projectAttribute = {
            attribute: { id: attributes.project.id },
            value: dataSet.project?.id,
        };
        const createdByAttribute = { attribute: { id: attributes.createdByApp.id }, value: "true" };

        const attributesToSave = [projectAttribute, createdByAttribute].filter(
            attribute => attribute.value
        );

        const filteredExisting =
            existingAttributes?.filter(
                attr => !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
            ) || [];

        return [...filteredExisting, ...attributesToSave];
    }

    private getIndicatorTypeName(type: string): string {
        switch (type) {
            case "outputs":
                return indicatorTypeLabel.outputs;
            case "outcomes":
                return indicatorTypeLabel.outcomes;
            default:
                return "";
        }
    }
}

type D2DataSetSection = {
    id: string;
    code: string;
    dataSet: Ref;
    name: string;
    greyedFields: Array<{ dataElement: Ref; categoryOptionCombo: Ref }>;
    dataElements: Ref[];
    indicators: Ref[];
};

const indicatorTypeLabel = { outcomes: "Outcomes", outputs: "Outputs" };

type SharingUserGroup = Record<Id, { id: Id; access: OctalNotationPermission }>;
