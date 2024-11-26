import { D2AttributeValue } from "@eyeseetea/d2-api/2.36";
import { D2Api } from "$/types/d2-api";

import { apiToFuture } from "$/data/api-futures";
import { DataSet, DataSetList, DataSetToSave } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import {
    DataSetName,
    DataSetRepository,
    GetDataSetOptions,
} from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { getUid } from "$/utils/uid";
import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api, dataSetFieldsWithOrgUnits } from "$/data/repositories/DataSetD2Api";
import { Maybe } from "$/utils/ts-utils";
import { chunkRequest } from "$/data/utils";
import { D2Config } from "$/data/repositories/D2ApiConfig";

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
            const $requests = chunkRequest(ids, dataSetIds => {
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

                    return apiToFuture(this.api.metadata.post({ dataSets: dataSetsToSave })).map(
                        () => []
                    );
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
                const allErrors = response.typeReports.flatMap(typeReport =>
                    typeReport.objectReports.flatMap(objectReport =>
                        objectReport.errorReports.flatMap(errorReport => errorReport.message)
                    )
                );
                if (allErrors.length > 0) return Future.error(new Error(allErrors.join("\n")));
                return Future.success([]);
            });
        });

        return $requests.toVoid();
    }

    private buildD2DataSet(
        dataSet: DataSetToSave,
        existingAttributes: Maybe<D2AttributeValue[]>,
        attributes: D2Config["attributes"]
    ) {
        return {
            id: dataSet.id || getUid(dataSet.name),
            name: dataSet.name,
            periodType: "Monthly",
            description: dataSet.description,
            shortName: dataSet.shortName,
            publicAccess: this.d2DataSetApi.generateFullPermission(dataSet.permissions),
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
                .compactMap(access => {
                    if (access.type !== "groups") return undefined;
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

    private buildD2Attributes(
        existingAttributes: Maybe<D2AttributeValue[]>,
        dataSet: DataSetToSave,
        attributes: D2Config["attributes"]
    ) {
        // if (!dataSet.project) return existingAttributes || [];
        // const projectAttributeId = attributes.project.id;
        // const projectAttribute = existingAttributes?.find(
        //     attribute => attribute.attribute.id === projectAttributeId
        // );

        const pa = { attribute: { id: attributes.project.id }, value: dataSet.project?.id };
        const createdByAttribute = { attribute: { id: attributes.createdByApp.id }, value: "true" };

        const attributesToSave = _([pa, createdByAttribute])
            .compactMap(attribute => (attribute.value ? attribute : undefined))
            .value();

        const filteredExisting =
            existingAttributes?.filter(
                attr => !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
            ) || [];

        // Combinar `filteredExisting` con `toSave`
        return [...filteredExisting, ...attributesToSave];
    }
}
