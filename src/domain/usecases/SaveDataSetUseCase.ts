import _ from "$/domain/entities/generic/Collection";
import { AccessData, DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { Maybe } from "$/utils/ts-utils";
import { getErrors } from "$/domain/entities/generic/Error";
import { Id } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { DataElement } from "$/domain/entities/DataElement";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";

export class SaveDataSetUseCase {
    constructor(
        private dataSetRepository: DataSetRepository,
        private dataElementRepository: DataElementRepository
    ) {}

    execute(dataSet: DataSet): FutureData<void> {
        return this.getDataSetById(dataSet.id).flatMap(existingDataSet => {
            const dataSetToSave = DataSet.create({
                ...(existingDataSet || {}),
                ...dataSet,
                access: this.mergeExistingUserGroups(dataSet, existingDataSet),
                shortName: this.truncateValue(dataSet.name),
            });

            const result = dataSetToSave.validate();

            if (result.isError()) {
                const errors = getErrors(result.value.error);
                return Future.error(new Error(errors.join("\n")));
            }

            const relatedDataElementsFromIndicators =
                this.getRelatedDataElementsFromIndicators(dataSetToSave);

            const dataElementIdentifiables = relatedDataElementsFromIndicators
                .values()
                .flatMap(ids => ids);

            return this.getDataElementsByIds(dataElementIdentifiables).flatMap(dataElements => {
                const indicatorsWithDataElements = dataSetToSave.indicators.map(indicator => {
                    return indicator.setRelatedDataElements(
                        dataElements,
                        relatedDataElementsFromIndicators
                    );
                });

                const dataSetWithIndicatorsRelated = dataSetToSave.setIndicators(
                    indicatorsWithDataElements
                );

                return this.dataSetRepository.save([dataSetWithIndicatorsRelated]);
            });
        });
    }

    private mergeExistingUserGroups(
        dataSet: DataSet,
        existingDataSet: Maybe<DataSet>
    ): AccessData[] {
        if (!existingDataSet) return dataSet.access;
        const userGroups = existingDataSet.access.filter(access => access.type === "users");
        return dataSet.access.concat(userGroups);
    }

    private getDataElementsByIds(ids: Id[]): FutureData<DataElement[]> {
        return this.dataElementRepository.getBy(ids);
    }

    private getRelatedDataElementsFromIndicators(
        dataSetToSave: DataSet
    ): HashMap<string, string[]> {
        return _(dataSetToSave.indicators)
            .filter(indicator => indicator.type === "outcomes")
            .toHashMap(indicator => {
                const idsInNumerator = this.extractId(indicator.numerator, /#{(\w+)/);
                const idsInDenominator = this.extractId(indicator.denominator, /#{(\w+)/);
                const dataElementCode = indicator.code ? [`${indicator.code}-C`] : [];
                return [indicator.id, [...idsInNumerator, ...idsInDenominator, ...dataElementCode]];
            });
    }

    private extractId(string: string, re: RegExp): Id[] {
        const globalRe = new RegExp(re, "g");
        return _(Array.from(string.matchAll(globalRe), match => match[1]))
            .compactMap(item => item)
            .value();
    }

    private getDataSetById(id: string): FutureData<Maybe<DataSet>> {
        return this.dataSetRepository.getByIds([id]).map(dataSets => {
            return _(dataSets).first();
        });
    }

    private truncateValue(input: string): string {
        const targetLength = 50;
        return input.length > targetLength ? input.slice(0, targetLength) : input;
    }
}
