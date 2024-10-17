import { D2Api } from "$/types/d2-api";
import { FutureData, apiToFuture } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetRepository, GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { Future } from "$/domain/entities/generic/Future";
import { getUid } from "$/utils/uid";

import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api, dataSetFields } from "$/data/repositories/DataSetD2Api";
import { MetadataItem } from "$/domain/entities/MetadataItem";
import { D2AttributeValue } from "@eyeseetea/d2-api/2.36";
import { Maybe } from "$/utils/ts-utils";

export class DataSetD2Repository implements DataSetRepository {
    private d2DataSetApi: DataSetD2Api;
    constructor(private api: D2Api, private metadata: MetadataItem) {
        this.d2DataSetApi = new DataSetD2Api(this.api, metadata);
    }

    get(options: GetDataSetOptions): FutureData<Paginated<DataSet>> {
        return this.d2DataSetApi.get(options);
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
        return this.d2DataSetApi.get({
            paging: { page, pageSize },
            filters: {},
            sorting: { field: "name", order: "asc" },
            includeOrgUnits: true,
        });
    }

    getByIds(ids: string[]): FutureData<DataSet[]> {
        if (ids.length === 0) return Future.success([]);
        return this.d2DataSetApi
            .getBaseData({ projectsIds: undefined })
            .flatMap(({ attributeData, coreCompetencies }) => {
                const attributesToFilter = attributeData.map(attribute => attribute.id);
                const $requests = Future.sequential(
                    _(ids)
                        .chunk(50)
                        .map(dataSetIds => {
                            return apiToFuture(
                                this.api.models.dataSets.get({
                                    paging: false,
                                    filter: {
                                        "attributeValues.attribute.id": { in: attributesToFilter },
                                        "attributeValues.value": { eq: "true" },
                                        id: { in: dataSetIds },
                                    },
                                    fields: {
                                        ...dataSetFields,
                                        organisationUnits: {
                                            id: true,
                                            displayName: true,
                                            path: true,
                                        },
                                    },
                                })
                            );
                        })
                        .value()
                );

                return $requests.map(d2Response => {
                    const allDataSets = d2Response.flatMap(d2Response => d2Response.objects);
                    const dataSets = allDataSets.map(d2DataSet => {
                        return this.d2DataSetApi.buildDataSet(d2DataSet, coreCompetencies, []);
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
                .chunk(100)
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

                            const existingAttributes = existingDataSet?.attributeValues;

                            const result = {
                                ...(existingDataSet || {}),
                                ...this.buildD2DataSet(dataSet, existingAttributes),
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
                            { dataSets: dataSetIds.map(id => ({ id })) },
                            { importStrategy: "DELETE" }
                        )
                    );
                })
                .value()
        );

        return $requests.toVoid();
    }

    private buildD2DataSet(dataSet: DataSet, existingAttributes: Maybe<D2AttributeValue[]>) {
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
            attributeValues: this.buildD2Attributes(existingAttributes, dataSet),
        };
    }

    private buildD2Attributes(existingAttributes: Maybe<D2AttributeValue[]>, dataSet: DataSet) {
        if (!dataSet.project) return existingAttributes || [];
        const projectAttributeId = this.metadata.attributes.project.id;
        const projectAttribute = existingAttributes?.find(
            attribute => attribute.attribute.id === projectAttributeId
        );

        if (projectAttribute && existingAttributes) {
            return existingAttributes.map(d2Attribute => {
                if (!dataSet.project) return d2Attribute;
                if (d2Attribute.attribute.id === projectAttributeId) {
                    return { ...d2Attribute, value: dataSet.project.id };
                }
                return d2Attribute;
            });
        } else {
            return [
                ...(existingAttributes || []),
                {
                    attribute: { id: projectAttributeId },
                    value: dataSet.project.id,
                },
            ];
        }

        // return existingAttributes
        //     ? existingAttributes.map(d2Attribute => {
        //           if (!dataSet.project) return d2Attribute;
        //           if (d2Attribute.attribute.id === projectAttributeId) {
        //               return { ...d2Attribute, value: dataSet.project.id };
        //           }
        //           return d2Attribute;
        //       })
        //     : [
        //           {
        //               attribute: { id: projectAttributeId },
        //               value: dataSet.project.id,
        //           },
        //       ];
    }
}
