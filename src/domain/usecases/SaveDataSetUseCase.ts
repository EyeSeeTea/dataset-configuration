import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { getErrors } from "$/domain/entities/generic/Error";
import { Id } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";
import { Indicator } from "$/domain/entities/Indicator";
import { DataSetUtils } from "$/domain/usecases/common/DataSetUtils";
import i18n from "$/utils/i18n";

export class SaveDataSetUseCase {
    private dataSetUtils: DataSetUtils;

    constructor(
        private dataSetRepository: DataSetRepository,
        private dataElementRepository: DataElementRepository
    ) {
        this.dataSetUtils = new DataSetUtils(this.dataSetRepository);
    }

    execute(dataSet: DataSet): FutureData<void> {
        const result = dataSet.validate();

        if (result.length > 0) {
            const errors = getErrors(result);
            return Future.error(new Error(errors.join("\n")));
        }

        return this.validateDataSetName(dataSet).flatMap(dataSetAlreadyExists => {
            if (dataSetAlreadyExists)
                return Future.error(
                    new Error(
                        i18n.t("Data set name already exists: {{dataSetName}}", {
                            nsSeparator: false,
                            dataSetName: dataSet.name,
                        })
                    )
                );

            return this.getDataElementsRelatedFromIndicators(dataSet).flatMap(
                indicatorsWithDataElements => {
                    const dataSetWithIndicatorsRelated = dataSet.setIndicators(
                        indicatorsWithDataElements
                    );
                    return this.dataSetRepository.save([dataSetWithIndicatorsRelated]);
                }
            );
        });
    }

    private validateDataSetName(dataSet: DataSet): FutureData<boolean> {
        return this.dataSetUtils.isDataSetNameDuplicate({
            name: dataSet.name,
            dataSetId: dataSet.id,
        });
    }

    private getDataElementsRelatedFromIndicators(dataSet: DataSet): FutureData<Indicator[]> {
        const relatedDataElementsFromIndicators =
            this.getRelatedDataElementsFromIndicators(dataSet);

        const dataElementIdentifiables = relatedDataElementsFromIndicators
            .values()
            .flatMap(ids => ids);

        return this.dataElementRepository.getBy(dataElementIdentifiables).map(dataElements => {
            return dataSet.indicators.map(indicator => {
                return indicator.setRelatedDataElements(
                    dataElements,
                    relatedDataElementsFromIndicators
                );
            });
        });
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
}
