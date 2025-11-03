import differenceBy from "lodash/differenceBy";
import { D2AttributeValue, MetadataPick, D2Api, MetadataResponse } from "$/types/d2-api";

import { apiToFuture } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import {
    DataSetName,
    DataSetRepository,
    GetDataSetOptions,
} from "$/domain/repositories/DataSetRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { getUid, generateUid } from "$/utils/uid";
import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api, dataSetFieldsWithOrgUnits } from "$/data/repositories/DataSetD2Api";
import { Maybe } from "$/utils/ts-utils";
import { buildErrorFromException, chunkRequest, runMetadata } from "$/data/utils";
import { D2Config } from "$/data/repositories/D2ApiMetadata";

import getTemplate, { DataSetTemplate } from "$/data/entry-form/CustomForm";
import { D2ApiCategoryCombo, D2ApiCategoryComboType } from "$/data/D2ApiCategoryCombo";
import { IndicatorAttrs, indicatorTypes } from "$/domain/entities/Indicator";
import { Id, Ref, getRefs } from "$/domain/entities/Ref";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { Config } from "$/domain/entities/Config";
import { DataSetList } from "$/domain/entities/DataSetList";
import isEqual from "lodash/isEqual";
import { D2ApiSharing, D2ApiSharingName } from "$/data/D2ApiSharing";
import { D2IndicatorMatchingParser } from "$/data/D2IndicatorMatchingParser";

const DIMENSITON_TYPE = "DISAGGREGATION" as const;
const CUSTOM_FORM_STYLE = "NORMAL" as const;

export class DataSetD2Repository implements DataSetRepository {
    private d2DataSetApi: DataSetD2Api;
    private D2ApiCategoryCombo: D2ApiCategoryCombo;
    private d2ApiSharing: D2ApiSharing;

    constructor(private api: D2Api, private config: Config) {
        this.d2DataSetApi = new DataSetD2Api(this.api, this.config);
        this.D2ApiCategoryCombo = new D2ApiCategoryCombo(this.api);
        this.d2ApiSharing = new D2ApiSharing();
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
                            [attributes.createdByApp.id]: { eq: "true" },
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
                        fields: { ...ownerFields, dataEntryForm: { id: true, htmlCode: true } },
                        filter: { id: { in: dataSetIds } },
                        paging: false,
                    })
                ).flatMap(d2Response => {
                    return this.saveAllDataSets(
                        dataSetIds,
                        dataSets,
                        d2Response.objects,
                        config
                    ).map(() => []);
                });
            });

            return $requests.toVoid();
        });
    }

    private saveAllDataSets(
        dataSetIds: string[],
        dataSets: DataSetToSave[],
        existingDataSets: D2DataSetOwnerEntryForm[],
        config: D2Config
    ): FutureData<void> {
        return this.getSectionsByIds(dataSetIds).flatMap(existingSections => {
            return this.getCategoryCombosByDataSets(dataSets, dataSetIds).flatMap(ccByDataSet => {
                const dataSetsToSave = this.getD2DataSetsToSave(
                    dataSetIds,
                    existingDataSets,
                    dataSets,
                    config,
                    ccByDataSet,
                    existingSections
                );

                const { categoryCombos, categoryOptionCombos } = this.buildCategoryCombinations(
                    dataSets,
                    this.config
                );

                const metadataToPost = {
                    categoryCombos,
                    categoryOptionCombos,
                    dataSets: dataSetsToSave.map(ds => ({
                        ...ds,
                        dataEntryForm: { id: ds.dataEntryForm.id },
                    })),
                    dataEntryForms: _(dataSetsToSave)
                        .filter(dataSet =>
                            this.hasEntryFormChanged(
                                dataSet.id,
                                dataSet.dataEntryForm,
                                existingDataSets
                            )
                        )
                        .map(dataSet => dataSet.dataEntryForm)
                        .uniqBy(dataEntryForm => dataEntryForm.id)
                        .value(),
                };

                return runMetadata(this.api.metadata.post(metadataToPost))
                    .flatMap(() => {
                        return this.saveAllSections(
                            dataSetsToSave,
                            dataSets,
                            existingSections
                        ).toVoid();
                    })
                    .flatMapError(err => {
                        return Future.error(new Error(buildErrorFromException(err)));
                    });
            });
        });
    }

    private hasEntryFormChanged(
        dataSetId: Id,
        entryForm: D2EntryForm,
        existingDataSets: D2DataSetOwnerEntryForm[]
    ): boolean {
        const existingDataSet = existingDataSets.find(ds => ds.id === dataSetId);
        if (!existingDataSet) return true;

        const hasEntryFormChanged = existingDataSet.dataEntryForm?.htmlCode !== entryForm.htmlCode;
        return hasEntryFormChanged;
    }

    private getCategoryCombosByDataSets(
        dataSets: DataSetToSave[],
        dataSetIds: Id[]
    ): FutureData<D2CategoryComboDataSet[]> {
        const $requests = _(dataSetIds)
            .compactMap(dataSetId => {
                const dataSet = dataSets.find(ds => ds.id === dataSetId);
                if (!dataSet) return undefined;

                const categoryCombos = this.getDisaggregations(dataSet, this.config, {
                    filterExisting: false,
                });

                const d2CategoryCombos = categoryCombos.map(
                    (categoryCombo): D2ApiCategoryComboType => {
                        return {
                            ...categoryCombo,
                            displayName: categoryCombo.name,
                            categories: categoryCombo.categories.map(category => {
                                return {
                                    ...category,
                                    displayName: category.name,
                                    categoryOptions: category.options.map(option => {
                                        return {
                                            ...option,
                                            displayName: option.name,
                                        };
                                    }),
                                };
                            }),
                            categoryOptionCombos: categoryCombo.optionsCombos.map(optionCombo => {
                                return {
                                    ...optionCombo,
                                    displayName: optionCombo.name,
                                    categoryOptions: optionCombo.options.map(option => {
                                        return {
                                            ...option,
                                            displayName: option.name,
                                        };
                                    }),
                                };
                            }),
                        };
                    }
                );

                const ids = categoryCombos.map(cc => cc.id);
                return this.D2ApiCategoryCombo.getByIds(ids).map(categoryCombos => {
                    const nonExistingCategoryCombos = differenceBy(
                        d2CategoryCombos,
                        categoryCombos,
                        categoryCombo => categoryCombo.id
                    );
                    return {
                        dataSetId: dataSet.id,
                        categoryCombos: _(categoryCombos)
                            .concat(nonExistingCategoryCombos)
                            .uniqBy(cc => cc.id)
                            .value(),
                    };
                });
            })
            .value();

        return Future.parallel($requests, { concurrency: 5 });
    }

    private buildDataEntryForm(
        dataSet: DataSetTemplate & { id: Id; dataEntryForm?: D2DataSetOwner["dataEntryForm"] },
        dataSetToSave: DataSetToSave,
        ccByDataSet: D2CategoryComboDataSet[],
        config: D2Config,
        existingDataSetSections: D2Section[]
    ) {
        const allCategoryCombos =
            ccByDataSet.find(cc => cc.dataSetId === dataSet.id)?.categoryCombos ?? [];
        const html = getTemplate(
            dataSet,
            allCategoryCombos,
            dataSetToSave,
            config,
            existingDataSetSections
        );
        const id = dataSet.dataEntryForm?.id || generateUid();
        return {
            id,
            style: CUSTOM_FORM_STYLE,
            htmlCode: html,
            name: [dataSet.id, id].join("-"),
        };
    }

    private getD2DataSetsToSave(
        dataSetIds: string[],
        d2DataSets: D2DataSetOwnerEntryForm[],
        dataSets: DataSetToSave[],
        config: D2Config,
        ccByDataSet: D2CategoryComboDataSet[],
        existingSections: D2Section[]
    ) {
        return dataSetIds.map(dataSetId => {
            const existingDataSet = d2DataSets.find(ds => ds.id === dataSetId);
            const dataSet = dataSets.find(dataSet => dataSet.id === dataSetId);
            if (!dataSet) {
                throw Error(`Cannot find dataSet: ${dataSetId}`);
            }

            const existingAttributes = existingDataSet?.attributeValues;
            const sharingData = this.d2ApiSharing.generateSharingData(dataSet);

            const d2DataSet: D2DataSetToSave = {
                ...(existingDataSet || {}),
                ...this.buildD2DataSet(dataSet, existingAttributes, config),
                sharing: {
                    ...(existingDataSet?.sharing || {}),
                    ...sharingData,
                },
            };

            const existingDataSetSections = existingSections.filter(
                section => section.dataSet.id === dataSet.id
            );

            const customForm = this.buildDataEntryForm(
                d2DataSet,
                dataSet,
                ccByDataSet,
                config,
                existingDataSetSections
            );

            return { ...d2DataSet, dataEntryForm: customForm };
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

    private saveAllSections(
        dataSetsToSave: Ref[],
        dataSets: DataSetToSave[],
        existingSections: D2SectionWithGreyFields[]
    ): FutureData<void> {
        const sectionsActions = dataSetsToSave.flatMap(dataSetSaved => {
            const dataSet = dataSets.find(dataSet => dataSet.id === dataSetSaved.id);
            const existingSectionByDataSet = existingSections.filter(
                section => section.dataSet.id === dataSetSaved.id
            );

            const sectionsToSave = this.buildDataSetSections(
                dataSet,
                dataSetSaved.id,
                existingSectionByDataSet
            );

            const sectionsIdsToSave = new Set(sectionsToSave.map(section => section.id));

            const idsToDelete = existingSectionByDataSet.filter(
                item => !sectionsIdsToSave.has(item.id)
            );

            const areEqual = this.sectionsAreEqual(sectionsToSave, existingSectionByDataSet);
            // we have over 200K categoryOptionCombos on the server
            // which makes saving greyed fields very slow (average of 12 sec.)
            // skipping saving sections if their values are unchanged to optimize performance
            return { toSave: areEqual ? [] : sectionsToSave, toDelete: idsToDelete };
        });

        const sectionsToDelete = sectionsActions.flatMap(sectionAction =>
            sectionAction.toDelete.map(item => ({ id: item.id }))
        );

        return this.deleteSections(sectionsToDelete).flatMap(() => {
            const sectionsToSave = sectionsActions.flatMap(sectionAction => sectionAction.toSave);
            if (sectionsToSave.length === 0) return Future.success(undefined);

            return apiToFuture(this.api.metadata.post({ sections: sectionsToSave })).flatMap(
                sectionResponse => {
                    const allErrors = this.extractErrorsFromResponse(sectionResponse);
                    if (allErrors.length > 0) return Future.error(new Error(allErrors.join("\n")));
                    return Future.success(undefined);
                }
            );
        });
    }

    private sectionsAreEqual(
        sectionsToSave: D2DataSetSection[],
        existingSections: D2SectionWithGreyFields[]
    ) {
        const sortedSectionsToSave = _(sectionsToSave)
            .map(section => this.getSectionSorted(section))
            .sortBy(section => section.id)
            .value();

        const sortedExistinSections = _(existingSections)
            .map(section => this.getSectionSorted(section))
            .sortBy(section => section.id)
            .value();

        return isEqual(sortedSectionsToSave, sortedExistinSections);
    }

    private getSectionSorted(section: D2DataSetSection): D2DataSetSection {
        return {
            ...section,
            dataElements: _(section.dataElements)
                .sortBy(de => de.id)
                .value(),
            indicators: _(section.indicators)
                .sortBy(ind => ind.id)
                .value(),
            greyedFields: _(section.greyedFields)
                .map(x => ({
                    dataElement: x.dataElement,
                    categoryOptionCombo: x.categoryOptionCombo,
                }))
                .orderBy([
                    [item => item.dataElement.id, "asc"],
                    [item => item.categoryOptionCombo.id, "asc"],
                ])
                .value(),
        };
    }

    private deleteSections(ids: Ref[]): FutureData<void> {
        if (ids.length === 0) return Future.success(undefined);
        return apiToFuture(
            this.api.metadata.post({ sections: ids }, { importStrategy: "DELETE" })
        ).toVoid();
    }

    private getSectionsByIds(ids: Id[]): FutureData<D2SectionWithGreyFields[]> {
        if (ids.length === 0) return Future.success([]);
        return chunkRequest(ids, dataSetIds => {
            return apiToFuture(
                this.api.models.sections.get({
                    fields: {
                        $owner: true,
                        greyedFields: { id: true, dataElement: true, categoryOptionCombo: true },
                    },
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

    private buildDataSetSections(
        dataSet: Maybe<DataSet>,
        id: Id,
        dataSetSections: D2Section[]
    ): D2DataSetSection[] {
        const d2Sections = _(dataSet?.indicators ?? [])
            .groupBy(indicator => `${indicator.type}_${indicator.coreCompetency.id}`)
            .mapValues(([indicatorType, indicators]): D2DataSetSection => {
                const [type, sectionGroupId] = indicatorType.split("_");
                const coreCompetency = indicators[0]?.coreCompetency;
                if (!coreCompetency || !type)
                    throw Error(`Cannot find core competency name for ${indicatorType}`);

                const typeLabel = this.getIndicatorTypeName(type);
                const code = `${id}_${typeLabel.toUpperCase()}_${coreCompetency.code}`;
                const existingSectionInfo = dataSetSections.find(
                    section => section.code.toLowerCase() === code.toLowerCase()
                );

                const indicatorOutComes = indicators.filter(
                    indicator => indicator.type === "outcomes"
                );

                const relatedDataElements = indicatorOutComes.flatMap(
                    indicator => indicator.relatedDataElements
                );

                const refDataElements = relatedDataElements.map(dataElement => ({
                    id: dataElement.id,
                }));

                const indicatorTypeValue = indicatorTypes.find(
                    it => it === typeLabel.toLowerCase()
                );
                if (!indicatorTypeValue) {
                    throw Error(`Cannot find indicator type value for ${typeLabel}`);
                }

                const disabledFieldsForSection =
                    dataSet?.disabledFields.filter(
                        df => df.competencyId === sectionGroupId && indicatorTypeValue === df.type
                    ) ?? [];

                const dataElementsInSection = indicators
                    .filter(x => x.type === "outputs")
                    .map(indicator => ({ id: indicator.id }))
                    .concat(refDataElements);

                return {
                    ...(existingSectionInfo || {}),
                    id: existingSectionInfo?.id ?? getUid(code),
                    code,
                    dataSet: { id: id },
                    name: `${coreCompetency.name} ${typeLabel}`,
                    showColumnTotals: Boolean(dataSet?.sectionConfig.showColumnTotals),
                    showRowTotals: Boolean(dataSet?.sectionConfig.showRowTotals),
                    greyedFields: disabledFieldsForSection.map(disabledField => {
                        return {
                            dataElement: { id: disabledField.dataElementId },
                            categoryOptionCombo: { id: disabledField.optionComboId },
                        };
                    }),
                    dataElements: _(dataElementsInSection)
                        .uniqBy(dataElement => dataElement.id)
                        .value(),
                    indicators: _(indicatorOutComes)
                        .map(indicator => ({ id: indicator.id }))
                        .uniqBy(indicator => indicator.id)
                        .value(),
                };
            })
            .values();

        const sectionsOrderedByName = d2Sections.sort((a, b) => {
            const [competencyName, sectionType] = this.d2DataSetApi.getSectionNameAndType(a.name);
            const [competencyNameB, sectionTypeB] = this.d2DataSetApi.getSectionNameAndType(b.name);
            if (!sectionType || !sectionTypeB) return -1;
            if (!competencyName || !competencyNameB) return -1;

            const baseCompare = competencyName.localeCompare(competencyNameB);
            if (baseCompare !== 0) return baseCompare ?? -1;

            return sectionTypeB.localeCompare(sectionType);
        });

        return sectionsOrderedByName.map((section, index) => ({ ...section, sortOrder: index }));
    }

    private buildCategoryCombinations(
        dataSets: DataSetToSave[],
        config: Config
    ): { categoryCombos: D2CategoryCombo[]; categoryOptionCombos: D2CategoryOptionCombo[] } {
        const allCategoryCombos = dataSets.flatMap(dataSet => {
            const categoryCombosToCreate = this.getDisaggregations(dataSet, config, {
                filterExisting: true,
            });

            const publicAccessNotation = "r-------";

            return categoryCombosToCreate.map(categoryCombo => {
                return {
                    dataDimensionType: DIMENSITON_TYPE,
                    publicAccess: publicAccessNotation,
                    id: categoryCombo.id,
                    name: categoryCombo.name,
                    categories: getRefs(categoryCombo.categories),
                    userGroupAccesses: dataSet.access
                        .filter(access => access.type === "groups")
                        .map(access => ({ access: publicAccessNotation, id: access.id })),
                };
            });
        });

        const allCategoryOptionCombos = dataSets.flatMap(dataSet => {
            const disaggregations = this.getDisaggregations(dataSet, config, {
                filterExisting: true,
            });
            return disaggregations.flatMap(disaggregation => {
                return disaggregation.optionsCombos.map(optionCombo => {
                    return {
                        categoryCombo: optionCombo.categoryCombo,
                        id: optionCombo.id,
                        name: optionCombo.name,
                        categoryOptions: optionCombo.options.map(categoryOption => {
                            return { id: categoryOption.id };
                        }),
                    };
                });
            });
        });

        return {
            categoryCombos: _(allCategoryCombos)
                .uniqBy(cc => cc.id)
                .value(),
            categoryOptionCombos: allCategoryOptionCombos,
        };
    }

    private getDisaggregations(
        dataSet: DataSetToSave,
        config: Config,
        options: { filterExisting: boolean }
    ) {
        const { filterExisting } = options;
        const outputIndicators = dataSet.indicators.filter(
            indicator => indicator.type === "outputs"
        );
        const outcomeIndicators = dataSet.indicators
            .filter(indicator => indicator.type === "outcomes")
            .flatMap(indicator => indicator.relatedDataElements);

        const outputDisaggregations = _(outputIndicators)
            .compactMap(indicator => {
                if (!filterExisting) return indicator.disaggregation;

                const existing = config.categoryCombinations.find(
                    cc => cc.id === indicator.disaggregation?.id
                );
                if (existing) return undefined;
                return indicator.disaggregation;
            })
            .value();

        const outcomeDisaggregations = _(outcomeIndicators)
            .compactMap(dataElement => {
                if (!filterExisting) return dataElement.disaggregation;

                const existing = config.categoryCombinations.find(
                    cc => cc.id === dataElement.disaggregation?.id
                );
                if (existing) return undefined;
                return dataElement.disaggregation;
            })
            .value();

        const categoryCombosToCreate = outputDisaggregations.concat(outcomeDisaggregations);
        return categoryCombosToCreate;
    }

    private buildD2DataSet(
        dataSet: DataSetToSave,
        existingAttributes: Maybe<D2AttributeValue[]>,
        config: D2Config
    ) {
        return {
            renderAsTabs: dataSet.sectionConfig.renderAsTabs,
            dataElementDecoration: true,
            categoryCombo: {
                id: config.categoryCombos.projectTargetActual.id,
            },
            id: dataSet.id || getUid(dataSet.name),
            shortName: dataSet.shortName,
            name: dataSet.name,
            periodType: "Monthly",
            description: dataSet.description,
            dataSetElements: this.buildDataSetElements(dataSet),
            indicators: _(dataSet.indicators)
                .filter(indicator => indicator.type === "outcomes")
                .map(indicator => ({ id: indicator.id }))
                .uniqBy(indicator => indicator.id)
                .value(),
            organisationUnits: dataSet.orgUnits.map(ou => ({ id: ou.id })),
            attributeValues: this.buildD2Attributes(existingAttributes, dataSet, config.attributes),
            notifyCompletingUser: dataSet.notifyUser,
            openFuturePeriods: dataSet.openFuturePeriods,
            expiryDays: dataSet.expiryDays,
            dataInputPeriods: this.buildDataInputPeriod(dataSet),
        };
    }

    private buildDataSetElements(dataSet: DataSetToSave) {
        const relatedDataElements = dataSet.indicators
            .filter(indicator => indicator.type === "outcomes")
            .flatMap(indicator => indicator.relatedDataElements)
            .map(dataElement => {
                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id: dataElement.id },
                    categoryCombo: { id: dataElement.disaggregation?.id },
                };
            });

        const selectedIndicators = dataSet.indicators
            .filter(indicator => indicator.type === "outputs")
            .map(indicator => {
                return {
                    dataSet: { id: dataSet.id },
                    dataElement: { id: indicator.id },
                    categoryCombo: { id: indicator.disaggregation?.id },
                };
            });

        return _(relatedDataElements.concat(selectedIndicators))
            .uniqBy(de => de.dataElement.id)
            .value();
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
        const indicatorMatching = this.parseIndicatorMatching(dataSet, attributes);

        const attributesToSave = [
            projectAttribute,
            createdByAttribute,
            inputDate,
            periodDate,
            indicatorMatching,
        ].filter(attribute => attribute.value);

        const filteredExisting =
            existingAttributes?.filter(
                attr => !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
            ) || [];

        return [...filteredExisting, ...attributesToSave];
    }

    private buildDataInputPeriod(dataSet: DataSetToSave): D2DataSetToSave["dataInputPeriods"] {
        return (
            dataSet.periodDate?.dataInputPeriods.map(p => ({
                closingDate: p.endDate,
                openingDate: p.startDate,
                period: {
                    id: p.period,
                },
            })) ?? []
        );
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

    private parseIndicatorMatching(
        dataSetToSave: DataSetToSave,
        attributes: D2Config["attributes"]
    ): D2Attribute {
        return {
            attribute: { id: attributes.indicatorMatching.id },
            value: dataSetToSave.indicatorMatching?.length
                ? D2IndicatorMatchingParser.parseIndicatorMatching(dataSetToSave.indicatorMatching)
                : "",
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
    showColumnTotals: boolean;
    showRowTotals: boolean;
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
export type D2DataSetOwnerEntryForm = Omit<D2DataSetOwner, "dataEntryForm"> & {
    dataEntryForm: Maybe<D2EntryForm>;
};
type D2EntryForm = { id: Id; htmlCode: string };

type D2CategoryCombo = {
    dataDimensionType: "DISAGGREGATION";
    publicAccess: string;
    id: string;
    name: string;
    categories: Ref[];
    userGroupAccesses: Array<{ access: string; id: string }>;
};

type D2CategoryOptionCombo = {
    categoryCombo: Ref;
    id: Id;
    name: string;
    categoryOptions: Ref[];
};

type D2CategoryComboDataSet = { dataSetId: Id; categoryCombos: D2ApiCategoryComboType[] };

export type D2Section = MetadataPick<{
    sections: { fields: typeof ownerFields };
}>["sections"][number];
export type D2SectionWithGreyFields = Omit<D2Section, "greyedFields"> & {
    greyedFields: Array<{
        id: Id;
        dataElement: Ref;
        categoryOptionCombo: Ref;
    }>;
};

export type D2Attribute = { attribute: { id: Id }; value: string };

type D2DataSetToSave = {
    renderAsTabs: boolean;
    dataElementDecoration: boolean;
    categoryCombo: Ref;
    id: Id;
    shortName: string;
    name: string;
    periodType: string;
    description: string;
    dataSetElements: Array<{
        dataSet: Ref;
        dataElement: Ref;
        categoryCombo: { id: Maybe<Id> };
    }>;
    indicators: Ref[];
    organisationUnits: Ref[];
    attributeValues: Array<{
        attribute: Ref;
        value: Maybe<string>;
    }>;
    notifyCompletingUser: boolean;
    openFuturePeriods: number;
    expiryDays: number;
    sharing: {
        public: string;
        users: Record<Id, D2ApiSharingName>;
        userGroups: Record<Id, D2ApiSharingName>;
    };
    dataInputPeriods: { closingDate: string; openingDate: string; period: Ref }[];
};
