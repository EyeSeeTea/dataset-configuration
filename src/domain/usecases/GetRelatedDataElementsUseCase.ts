import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";

export class GetRelatedDataElementsUseCase {
    constructor(private dataElementRepository: DataElementRepository) {}

    execute(options: Options): FutureData<Indicator[]> {
        return this.getDataElementsRelatedFromIndicators(options);
    }

    private getDataElementsRelatedFromIndicators(options: {
        dataSet: DataSet;
        indicatorIdsToIgnore: Id[];
    }): FutureData<Indicator[]> {
        const { dataSet, indicatorIdsToIgnore: indicatorsIdsToIgnore } = options;
        const relatedDataElementsFromIndicators = this.getRelatedDataElementsFromIndicators(
            dataSet,
            indicatorsIdsToIgnore
        );

        const dataElementIdentifiables = relatedDataElementsFromIndicators.values().flat();

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

type Options = { dataSet: DataSet; indicatorIdsToIgnore: Id[] };
