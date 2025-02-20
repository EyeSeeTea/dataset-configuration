import { Config } from "$/domain/entities/Config";
import { DataSet } from "$/domain/entities/DataSet";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import i18n from "$/utils/i18n";
import { getUid } from "$/utils/uid";

export class GetDataSetSettingsUseCase {
    constructor(
        private coreCompetencyRepository: CoreCompetencyRepository,
        private indicatorRepository: IndicatorRepository,
        private dataSetRepository: DataSetRepository,
        private config: Config
    ) {}

    execute(options: { dataSetId: Id }): FutureData<DataSetSettings> {
        return Future.joinObj({
            dataSet: this.getOrCreateDataSet(options.dataSetId),
            coreCompetencies: this.coreCompetencyRepository.getAll(),
        }).flatMap(({ coreCompetencies, dataSet }) => {
            return Future.success({
                coreCompetencies,
                dataSet,
                indicators: this.config.indicators.map(indicator => {
                    const existingIndicator = dataSet.indicators.find(
                        ind => ind.id === indicator.id
                    );
                    return existingIndicator
                        ? Indicator.create({
                              ...indicator,
                              disaggregation:
                                  existingIndicator.type === "outputs"
                                      ? existingIndicator.disaggregation
                                      : undefined,
                              relatedDataElements:
                                  existingIndicator.type === "outcomes"
                                      ? existingIndicator.relatedDataElements
                                      : [],
                          })
                        : indicator;
                }),
                existingIndicatorsIds: dataSet.indicators.map(indicator => indicator.id),
            });
        });
    }

    private getOrCreateDataSet(dataSetId: Id): FutureData<DataSet> {
        if (!dataSetId)
            return Future.success(DataSet.initial(getUid(new Date().getTime().toString())));
        return this.dataSetRepository.getByIds([dataSetId]).flatMap(dataSets => {
            const dataSet = dataSets[0];
            return dataSet
                ? Future.success(dataSet)
                : Future.error(new Error(i18n.t("DataSet not found")));
        });
    }

    private getExistingIndicators(dataSetId: Id): FutureData<Indicator[]> {
        if (!dataSetId) return Future.success([]);
        return this.indicatorRepository.getByDataSetId(dataSetId);
    }
}
