import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";
import { Indicator } from "$/domain/entities/Indicator";

export class IndicatorUtils {
    constructor(private dataElementRepository: DataElementRepository) {}

    getDataElementsRelatedFromIndicators(options: {
        dataSet: DataSet;
        indicatorsIdsToIgnore: Id[];
    }): FutureData<Indicator[]> {
        const { dataSet, indicatorsIdsToIgnore } = options;
        const relatedDataElementsFromIndicators = this.getRelatedDataElementsFromIndicators(
            dataSet,
            indicatorsIdsToIgnore
        );

        const dataElementIdentifiables = relatedDataElementsFromIndicators
            .values()
            .flatMap(ids => ids);

        if (dataElementIdentifiables.length === 0) return Future.success(dataSet.indicators);

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
        dataSetToSave: DataSet,
        ignoreIndicatorsIds: Id[]
    ): HashMap<string, string[]> {
        return _(dataSetToSave.indicators)
            .filter(indicator => indicator.type === "outcomes")
            .reject(indicator => ignoreIndicatorsIds.includes(indicator.id))
            .toHashMap(indicator => {
                return [indicator.id, Indicator.extractDataElementsReferences(indicator)];
            });
    }
}
