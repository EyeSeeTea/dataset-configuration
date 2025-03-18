import { D2AttributeValue, MetadataPick } from "@eyeseetea/d2-api/2.36";
import { D2Api, MetadataResponse } from "$/types/d2-api";

import { apiToFuture } from "$/data/api-futures";
import { DataSet, DataSetList } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import {
    DataSetName,
    DataSetRepository,
    GetDataSetOptions,
} from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { generateUid, getUid } from "$/utils/uid";
import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api, dataSetFieldsWithOrgUnits } from "$/data/repositories/DataSetD2Api";
import { Maybe } from "$/utils/ts-utils";
import { chunkRequest, runMetadata } from "$/data/utils";
import { D2Config } from "$/data/repositories/D2ApiMetadata";
import { Indicator, IndicatorAttrs } from "$/domain/entities/Indicator";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { Config } from "$/domain/entities/Config";
import { Category } from "$/domain/entities/Category";
import { Disaggregation } from "$/domain/entities/DataElement";

export class DataSetD2Repository implements DataSetRepository {
    private d2DataSetApi: DataSetD2Api;

    constructor(private api: D2Api, private config: Config) {
        this.d2DataSetApi = new DataSetD2Api(this.api, this.config);
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
                        fields: ownerFields,
                        filter: { id: { in: dataSetIds } },
                        paging: false,
                    })
                ).flatMap(d2Response => {
                    const dataSetsToSave = this.getD2DataSetsToSave(
                        dataSetIds,
                        d2Response.objects,
                        dataSets,
                        config
                    );

                    const categoryCombos = this.buildCategoryCombinations(dataSets);

                    const metadataToPost = {
                        categoryCombos: categoryCombos,
                        categoryOptionCombos: this.buildCategoryOptionCombos(categoryCombos),
                        dataSets: dataSetsToSave,
                    };

                    return runMetadata(this.api.metadata.post(metadataToPost)).flatMap(() => {
                        return this.saveAllSections(dataSetsToSave, dataSets).map(() => []);
                    });
                });
            });

            return $requests.toVoid();
        });
    }

    private buildCategoryOptionCombos(categoryCombos: D2CategoryCombo[]) {
        const allCategories = this.config.categoryCombinations.flatMap(combination => {
            return combination.categories;
        });
        const uniqueCategories = _(allCategories)
            .uniqBy(category => category.id)
            .value();

        return categoryCombos.flatMap(categoryCombo => {
            const categoriesIds = categoryCombo.categories.map(category => category.id);
            const categories = uniqueCategories.filter(category =>
                categoriesIds.includes(category.id)
            );
            const categoryOptions = categories.map(category => category.options);
            const optionsCombinations = _(categoryOptions).cartesian().value();

            return optionsCombinations.map(optionCombination => {
                const categoryOptionsName = optionCombination
                    .map(optionsCombinations => optionsCombinations.name)
                    .join(", ");

                return {
                    categoryCombo: { id: categoryCombo.id },
                    id: generateUid(),
                    name: categoryOptionsName,
                    categoryOptions: optionCombination.map(categoryOption => ({
                        id: categoryOption.id,
                    })),
                };
            });
        });
    }

    private getD2DataSetsToSave(
        dataSetIds: string[],
        d2DataSets: D2DataSetOwner[],
        dataSets: DataSetToSave[],
        config: D2Config
    ) {
        return dataSetIds.map(dataSetId => {
            const existingDataSet = d2DataSets.find(ds => ds.id === dataSetId);
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

    private buildCategoryCombinations(dataSets: DataSetToSave[]) {
        const allCategoryCombos = dataSets.flatMap(dataSet => {
            return this.buildCategoryCombinationsByDataElements(dataSet)
                .filter(dataElementCombination => !dataElementCombination.existing)
                .map(dataElementCombination => dataElementCombination.categoryCombo);
        });
        return _(allCategoryCombos)
            .uniqBy(cc => cc.id)
            .value();
    }

    private buildCategoryCombinationsByDataElements(
        dataSet: DataSetToSave
    ): DataElementWithCombination[] {
        return dataSet.indicators.flatMap(indicator => {
            switch (indicator.type) {
                case "outputs": {
                    if (indicator.categories.length === 0) return [];
                    return _([
                        this.buildDataElementByCombination(
                            indicator.id,
                            indicator.categories,
                            indicator.disaggregation,
                            dataSet
                        ),
                    ])
                        .compactMap(deCombination => deCombination)
                        .value();
                }
                case "outcomes": {
                    const dataElementsComment = indicator.relatedDataElements.filter(
                        dataElement => dataElement.isComment
                    );
                    const dataElementsRelated = indicator.relatedDataElements.filter(
                        dataElement => !dataElement.isComment
                    );

                    const commentDataElement = _(dataElementsComment)
                        .compactMap(dataElement => {
                            return this.buildDataElementByCombination(
                                dataElement.id,
                                dataElement.categories,
                                dataElement.disaggregation,
                                dataSet
                            );
                        })
                        .value();

                    const relatedDataElements = _(dataElementsRelated)
                        .compactMap(dataElement => {
                            return this.buildDataElementByCombination(
                                dataElement.id,
                                dataElement.categories,
                                dataElement.disaggregation,
                                dataSet
                            );
                        })
                        .value();

                    return [...commentDataElement, ...relatedDataElements];
                }
            }
        });
    }

    private buildDataElementByCombination(
        id: Id,
        categories: Category[],
        disaggregation: Maybe<Disaggregation>,
        dataSet: DataSetToSave
    ): Maybe<DataElementWithCombination> {
        const categoriesNoDefault = categories.filter(category => category.name !== "default");
        if (categoriesNoDefault.length === 0) return undefined;

        const categoriesNames = categoriesNoDefault.map(category => category.name);
        const currentDisaggregation =
            disaggregation?.name !== "default" ? disaggregation?.name : undefined;
        const categoriesFromDisaggregation = disaggregation
            ? disaggregation.categories.filter(category => category.name !== "default")
            : [];

        const categoryComboName = [currentDisaggregation, ...categoriesNames]
            .filter(Boolean)
            .join("/");

        const currentCategoriesIds = categoriesFromDisaggregation
            .concat(categoriesNoDefault)
            .map(category => category.id)
            .join(".");

        const existingCategoryOptionCombo = currentCategoriesIds
            ? this.config.categoryCombinations.find(cc => {
                  const categoriesIds = cc.categories.map(category => category.id).join(".");
                  return categoriesIds === currentCategoriesIds;
              })
            : undefined;

        return {
            isComment: true,
            indicatorId: id,
            existing: Boolean(existingCategoryOptionCombo?.id),
            categoryCombo: {
                dataDimensionType: "DISAGGREGATION",
                publicAccess: "r-------",
                id: existingCategoryOptionCombo?.id ?? getUid(categoryComboName),
                name: categoryComboName,
                categories: categoriesNoDefault.map(category => ({ id: category.id })),
                userGroupAccesses: dataSet.access
                    .filter(access => access.type === "groups")
                    .map(access => {
                        return { access: "r-------", id: access.id };
                    }),
            },
        };
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
                .map(groupAccess => {
                    return {
                        access: this.d2DataSetApi.generateFullPermission(groupAccess.permissions),
                        id: groupAccess.id,
                        displayName: groupAccess.name,
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

    private buildDataSetElements(dataSet: DataSetToSave) {
        const categoryCombos = this.buildCategoryCombinationsByDataElements(dataSet);

        const relatedDataElements = dataSet.indicators
            .filter(indicator => indicator.type === "outcomes")
            .flatMap(indicator => indicator.relatedDataElements)
            .map(dataElement => {
                const categoryCombo = categoryCombos.find(cc => cc.indicatorId === dataElement.id);

                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id: dataElement.id },
                    categoryCombo: categoryCombo
                        ? { id: categoryCombo.categoryCombo.id }
                        : dataElement.disaggregation
                        ? { id: dataElement.disaggregation.id }
                        : undefined,
                };
            });

        const selectedIndicators = dataSet.indicators
            .filter(indicator => indicator.type === "outputs")
            .map(indicator => {
                const categoryCombo = categoryCombos.find(cc => cc.indicatorId === indicator.id);
                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id: indicator.id },
                    categoryCombo: categoryCombo
                        ? { id: categoryCombo.categoryCombo.id }
                        : indicator.disaggregation
                        ? { id: indicator.disaggregation.id }
                        : undefined,
                };
            });

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
        const { inputDate, periodDate } = this.parsePeriodDate(dataSet, attributes);

        const attributesToSave = [
            projectAttribute,
            createdByAttribute,
            inputDate,
            periodDate,
        ].filter(attribute => attribute.value);

        const filteredExisting =
            existingAttributes?.filter(
                attr => !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
            ) || [];

        return [...filteredExisting, ...attributesToSave];
    }

    private parsePeriodDate(
        dataSetToSave: DataSetToSave,
        attributes: D2Config["attributes"]
    ): { inputDate: D2Attribute; periodDate: D2Attribute } {
        const periods = dataSetToSave.periodDate
            ? dataSetToSave.periodDate.periodsShortFormat.map(period => {
                  return `${period.year}=${period.startDate}-${period.endDate}`;
              })
            : [];

        return {
            inputDate: {
                attribute: { id: attributes.inputDates.id },
                value: dataSetToSave.periodDate
                    ? `${dataSetToSave.periodDate.startDateShortFormat}-${dataSetToSave.periodDate.endDateShortFormat}`
                    : "",
            },
            periodDate: {
                attribute: { id: attributes.periodDates.id },
                value: periods.join(","),
            },
        };
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

const indicatorTypeLabel: Record<IndicatorAttrs["type"], string> = {
    outcomes: "Outcomes",
    outputs: "Outputs",
};

const ownerFields = { $owner: true };
export type D2DataSetOwner = MetadataPick<{
    dataSets: { fields: typeof ownerFields };
}>["dataSets"][number];

type D2CategoryCombo = {
    dataDimensionType: "DISAGGREGATION";
    publicAccess: string;
    id: string;
    name: string;
    categories: Ref[];
    userGroupAccesses: Array<{ access: string; id: string }>;
};

type D2Attribute = { attribute: { id: Id }; value: string };
type DataElementWithCombination = {
    isComment: boolean;
    indicatorId: Id;
    existing: boolean;
    categoryCombo: {
        dataDimensionType: "DISAGGREGATION";
        publicAccess: string;
        id: Id;
        name: string;
        categories: Ref[];
        userGroupAccesses: { access: string; id: Id }[];
    };
};
