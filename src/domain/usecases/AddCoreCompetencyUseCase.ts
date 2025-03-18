import { Config } from "$/domain/entities/Config";
import { DataSet, DisabledField } from "$/domain/entities/DataSet";
import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import _ from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";

export class AddCoreCompetencyUseCase {
    constructor(private dataSetRepository: DataSetRepository, private config: Config) {}
    execute(options: Options): FutureData<DataSet[]> {
        return this.getIndicatorsByCoreCompetencyId(options).flatMap(competencyIndicators => {
            console.debug(`Loading ${options.dataSetIds.length} dataSets...`);

            return this.dataSetRepository.getByIds(options.dataSetIds).flatMap(dataSets => {
                this.logNotFoundDataSets(dataSets, options.dataSetIds);

                const dataSetsCompetenciesModified = this.updateCompetenciesInDataSets(
                    options,
                    dataSets,
                    competencyIndicators
                );

                console.debug(`Saving ${dataSetsCompetenciesModified.length} dataSets...`);

                return this.dataSetRepository
                    .save(dataSetsCompetenciesModified)
                    .map(() => dataSetsCompetenciesModified);
            });
        });
    }

    private logNotFoundDataSets(dataSets: DataSet[], dataSetIds: Id[]) {
        const notFoundDataSetIds = _(dataSetIds)
            .difference(dataSets.map(x => x.id))
            .join(", ");

        if (notFoundDataSetIds.length > 0)
            console.debug(`DataSets ${notFoundDataSetIds} not found`);
    }

    private updateCompetenciesInDataSets(
        options: Options,
        dataSets: DataSet[],
        competencyIndicators: Indicator[]
    ): DataSet[] {
        const competencyLowerCase = options.coreCompetencyCode.toLowerCase();
        const indicatorsById = _(competencyIndicators).groupBy(indicator => indicator.id);
        return dataSets.map(dataSet => {
            const isCompetencyInDataSet = dataSet.indicators.some(indicator =>
                this.compareCompetencyCode(options, indicator.coreCompetency.code)
            );

            const indicatorsByCompetency = _(dataSet.indicators).groupBy(indicator =>
                indicator.coreCompetency.code.toLowerCase()
            );

            const indicatorsUpdated = indicatorsByCompetency
                .mapValues(([competencyCode, indicators]) => {
                    if (competencyCode === competencyLowerCase) return indicators;
                    return indicators.filter(indicator => !indicatorsById.hasKey(indicator.id));
                })
                .values()
                .flat();

            const indicatorsToAdd = isCompetencyInDataSet
                ? []
                : this.config.indicators.filter(indicator =>
                      this.compareCompetencyCode(options, indicator.coreCompetency.code)
                  );

            const disabledFields = _(dataSet.disabledFields)
                .compactMap(field => {
                    return this.replaceCompetency(dataSet.id, indicatorsUpdated, field);
                })
                .value();

            return DataSet.create({
                ...dataSet,
                indicators: indicatorsUpdated.concat(indicatorsToAdd),
                disabledFields,
            });
        });
    }

    private replaceCompetency(
        dataSetId: Id,
        indicators: Indicator[],
        disabledField: DisabledField
    ): Maybe<DisabledField> {
        switch (disabledField.type) {
            case "outputs": {
                const disabledFieldOutput = indicators.find(
                    indicator =>
                        indicator.id === disabledField.dataElementId &&
                        indicator.disaggregation?.optionsCombos.find(
                            optionCombo => optionCombo.id === disabledField.optionComboId
                        )
                );

                if (!disabledFieldOutput) {
                    this.logNotFoundGreyField(dataSetId, disabledField);
                    return undefined;
                }

                return { ...disabledField, competencyId: disabledFieldOutput.coreCompetency.id };
            }
            case "outcomes": {
                const onlyOutcomeIndicators = _(indicators)
                    .filter(indicator => indicator.type === "outcomes")
                    .value();

                const indicator = onlyOutcomeIndicators.find(indicator => {
                    const dataElementFromDisabledField = indicator.relatedDataElements.find(
                        de =>
                            de.id === disabledField.dataElementId &&
                            de.disaggregation?.optionsCombos.find(
                                oc => oc.id === disabledField.optionComboId
                            )
                    );
                    return Boolean(dataElementFromDisabledField);
                });

                if (!indicator) {
                    this.logNotFoundGreyField(dataSetId, disabledField);
                    return undefined;
                }

                return { ...disabledField, competencyId: indicator?.coreCompetency.id };
            }
        }
    }

    private logNotFoundGreyField(dataSetId: Id, disabledField: DisabledField) {
        console.warn(
            `dataElement not found for greyfield ${JSON.stringify(
                disabledField,
                null,
                2
            )} in dataSet ${dataSetId}`
        );
    }

    private getIndicatorsByCoreCompetencyId(options: Options): FutureData<Indicator[]> {
        const indicators = this.config.indicators.filter(
            indicator =>
                indicator.coreCompetency.code.toLowerCase() ===
                options.coreCompetencyCode.toLowerCase()
        );
        return indicators.length === 0
            ? Future.error(
                  new Error(
                      `Core competency ${options.coreCompetencyCode} does not have any indicators`
                  )
              )
            : Future.success(indicators);
    }

    private compareCompetencyCode(options: Options, coreCompetencyCode: string): boolean {
        return coreCompetencyCode.toLowerCase() === options.coreCompetencyCode.toLowerCase();
    }
}

type Options = { dataSetIds: Id[]; coreCompetencyCode: string };
