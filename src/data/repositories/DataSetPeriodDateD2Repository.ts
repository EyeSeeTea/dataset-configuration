import { D2Api } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import { DataSetPeriodDate } from "$/domain/entities/DataSetPeriodDate";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetPeriodDateRepository } from "$/domain/repositories/DataSetPeriodDateRepository";
import { DatePeriod } from "$/domain/entities/DatePeriod";
import { Maybe } from "$/utils/ts-utils";
import { Id } from "$/domain/entities/Ref";
import _ from "$/domain/entities/generic/Collection";
import { chunkRequest, getStatsFromD2Response } from "$/data/utils";
import { D2AttributeValue } from "@eyeseetea/d2-api/2.36";
import { Stats } from "$/domain/entities/Stats";
import { convertAttributeValueToDate } from "$/data/utils";
import { D2Attribute, D2DataSetOwner } from "$/data/repositories/DataSetD2Repository";
import { getStartEndDate, parsePeriodDateAttribute } from "$/data/period-dates";

export class DataSetPeriodDateD2Repository implements DataSetPeriodDateRepository {
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(this.api);
    }

    getAll(): FutureData<DataSetPeriodDate[]> {
        return this.d2ApiConfig.get().flatMap(config => {
            return this.getAllDataSets(1, [], config);
        });
    }

    save(dataSetPeriodDates: DataSetPeriodDate[]): FutureData<Stats[]> {
        if (dataSetPeriodDates.length === 0) return Future.success([]);
        const allIds = dataSetPeriodDates.map(dataSet => dataSet.id);
        return this.d2ApiConfig.get().flatMap(config => {
            const $requests = this.getAndSaveDataSets(allIds, dataSetPeriodDates, config);
            return $requests.map(stats => [Stats.combine(stats)]);
        });
    }

    private getAndSaveDataSets(
        allIds: string[],
        dataSetPeriodDates: DataSetPeriodDate[],
        config: D2Config
    ): FutureData<Stats[]> {
        return chunkRequest<Stats>(
            allIds,
            dataSetIds => {
                return apiToFuture(
                    this.api.models.dataSets.get({
                        fields: { $owner: true },
                        filter: { id: { in: dataSetIds } },
                        paging: false,
                    })
                ).flatMap(d2Response => {
                    return this.saveDataSets(
                        dataSetIds,
                        dataSetPeriodDates,
                        d2Response.objects,
                        config
                    );
                });
            },
            { chunkSize: 100 }
        );
    }

    private saveDataSets(
        dataSetIds: Id[],
        dataSetPeriodDates: DataSetPeriodDate[],
        d2DataSets: D2DataSetOwner[],
        config: D2Config
    ): FutureData<Stats[]> {
        const dataSetsToSave = dataSetIds.map(dataSetId => {
            const existingDataSet = d2DataSets.find(ds => ds.id === dataSetId);
            const dataSet = dataSetPeriodDates.find(dataSet => dataSet.id === dataSetId);
            if (!dataSet) {
                throw Error(`Cannot find dataSet: ${dataSetId}`);
            }

            return {
                ...(existingDataSet ?? {}),
                id: dataSet.id,
                attributeValues: this.buildD2Attributes(
                    existingDataSet?.attributeValues,
                    dataSet,
                    config.attributes
                ),
            };
        });
        return apiToFuture(this.api.metadata.post({ dataSets: dataSetsToSave })).map(response => {
            return [getStatsFromD2Response(response)];
        });
    }

    private buildD2Attributes(
        existingAttributes: Maybe<D2AttributeValue[]>,
        dataSet: DataSetPeriodDate,
        attributes: D2Config["attributes"]
    ) {
        const { periodDate } = this.parsePeriodDate(dataSet, attributes);

        const attributesToSave = [periodDate].filter(attribute => attribute.value);

        const filteredExisting =
            existingAttributes?.filter(
                attr => !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
            ) || [];

        return [...filteredExisting, ...attributesToSave];
    }

    private parsePeriodDate(
        dataSetToSave: DataSetPeriodDate,
        attributes: D2Config["attributes"]
    ): { periodDate: D2Attribute } {
        const periods = dataSetToSave.periodDate
            ? dataSetToSave.periodDate.periodsShortFormat.map(period => {
                  return `${period.year}=${period.startDate}-${period.endDate}`;
              })
            : [];

        return {
            periodDate: {
                attribute: { id: attributes.periodDates.id },
                value: periods.join(","),
            },
        };
    }

    private getAllDataSets(
        initialPage: number,
        dataSets: DataSetPeriodDate[],
        config: D2Config
    ): FutureData<DataSetPeriodDate[]> {
        return this.getDataSets(initialPage, config).flatMap(response => {
            const entities = response.objects.map(d2Object => {
                const build = (dateType: keyof D2Config["attributes"]) =>
                    this.buildPeriodDateFromAttributes(d2Object, config.attributes, dateType);

                return {
                    id: d2Object.id,
                    name: d2Object.name,
                    outcomeDate: build("outcomeDates"),
                    outputDate: build("outputDates"),
                    periodDate: build("periodDates"),
                };
            });
            const newDataSets = [...dataSets, ...entities];
            if (response.pager.page >= response.pager.pageCount) {
                return Future.success(newDataSets);
            } else {
                return this.getAllDataSets(initialPage + 1, newDataSets, config);
            }
        });
    }

    private getDataSets(page: number, config: D2Config) {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: {
                    id: true,
                    name: true,
                    attributeValues: { attribute: { id: true }, value: true },
                },
                filter: {
                    "attributeValues.attribute.id": { eq: config.attributes.inputDates.id },
                },
                page: page,
                pageSize: 200,
            })
        ).map(response => response);
    }

    private buildPeriodDateFromAttributes(
        d2DataSet: D2PeriodDataSet,
        attributes: D2Config["attributes"],
        propertyName: keyof D2Config["attributes"]
    ): DatePeriod {
        const inputDate = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === attributes.inputDates.id
        );
        const periodDate = d2DataSet.attributeValues.find(
            attribute => attribute.attribute.id === attributes[propertyName].id
        );

        const [startDate, endDate] = getStartEndDate(inputDate?.value);

        return DatePeriod.create({
            startDate: startDate ? convertAttributeValueToDate(startDate) : "",
            endDate: endDate ? convertAttributeValueToDate(endDate) : "",
            periods: periodDate ? parsePeriodDateAttribute(periodDate?.value) : [],
        });
    }
}

type D2PeriodDataSet = {
    id: string;
    name: string;
    attributeValues: Array<{ attribute: { id: string }; value: string }>;
};
