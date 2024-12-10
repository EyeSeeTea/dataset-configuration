import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { Id, Ref } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import { CoreCompetency } from "$/domain/entities/DataSet";

export class IndicatorD2Repository implements IndicatorRepository {
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(this.api);
    }

    get(): FutureData<Indicator[]> {
        return this.getConfig().flatMap(config => {
            return Future.joinObj({
                outcomeIndicators: this.getOutcomeIndicators(config),
                outputIndicators: this.getOutputIndicators(config),
            }).map(({ outcomeIndicators, outputIndicators }) => {
                return outcomeIndicators.concat(outputIndicators);
            });
        });
    }

    getByDataSetId(dataSetId: Id): FutureData<Indicator[]> {
        return Future.joinObj({
            dataSetSections: this.getDataSetSections(dataSetId),
            indicators: this.get(),
        }).map(({ dataSetSections, indicators }) => {
            if (dataSetSections.sections.length === 0) return indicators;

            const dataElementsInSection = dataSetSections.sections.flatMap(section =>
                section.dataElements.map(dataElement => dataElement.id)
            );

            const indicatorsInSection = dataSetSections.sections.flatMap(section =>
                section.indicators.map(indicator => indicator.id)
            );

            const allIds = dataElementsInSection.concat(indicatorsInSection);

            return indicators.filter(indicator => allIds.includes(indicator.id));
        });
    }

    private getDataSetSections(id: Id): FutureData<D2DataSetSection> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: {
                    id: true,
                    sections: {
                        id: true,
                        name: true,
                        code: true,
                        dataElements: {
                            id: true,
                            displayName: true,
                            code: true,
                            categoryCombo: { id: true, displayName: true },
                        },
                        indicators: { id: true, displayName: true, code: true },
                    },
                },
                filter: { id: { eq: id } },
                paging: false,
            })
        ).flatMap(d2Response => {
            const d2DataSet = d2Response.objects[0];
            if (!d2DataSet) return Future.error(new Error("DataSet not found"));
            return Future.success({
                id: d2DataSet.id,
                sections: d2DataSet.sections.map(section => {
                    return {
                        id: section.id,
                        name: section.name,
                        code: section.code,
                        dataElements: section.dataElements,
                        indicators: section.indicators,
                    };
                }),
            });
        });
    }

    private getConfig(): FutureData<D2Config> {
        return this.d2ApiConfig.get();
    }

    private getOutcomeIndicators(config: D2Config): FutureData<Indicator[]> {
        return this.getCompetencies(config).flatMap(competencies => {
            const competenciesNames = competencies.map(c => c.name);
            return apiToFuture(
                this.api.models.indicatorGroups.get({
                    fields: {
                        id: true,
                        code: true,
                        displayName: true,
                        indicators: {
                            code: true,
                            attributeValues: { attribute: { id: true }, value: true },
                            denominator: true,
                            displayName: true,
                            id: true,
                            indicatorGroups: {
                                displayName: true,
                                id: true,
                                indicatorGroupSet: { id: true, displayName: true },
                            },
                            numerator: true,
                        },
                    },
                    filter: { name: { in: competenciesNames } },
                })
            ).map(d2Response => {
                const indicatorsOutcome = d2Response.objects.flatMap(indicatorGroup => {
                    const competency = competencies.find(
                        c => c.name.toLowerCase() === indicatorGroup.displayName.toLowerCase()
                    );
                    if (!competency) return [];

                    const indicators = _(indicatorGroup.indicators)
                        .compactMap(indicator => {
                            const scope = this.getScope(
                                indicator.indicatorGroups,
                                config,
                                "indicatorGroups"
                            );
                            if (!scope) return undefined;

                            const theme = indicator.indicatorGroups.find(
                                ig => ig.indicatorGroupSet.id === config.indicatorGroupSets.theme.id
                            );
                            const status = indicator.indicatorGroups.find(
                                ig =>
                                    ig.indicatorGroupSet.id === config.indicatorGroupSets.status.id
                            );
                            const group = indicator.attributeValues.find(
                                attribute => attribute.attribute.id === config.attributes.group.id
                            );

                            return Indicator.create({
                                relatedDataElements: [],
                                denominator: indicator.denominator,
                                numerator: indicator.numerator,
                                coreCompetency: competency,
                                id: indicator.id,
                                name: indicator.displayName,
                                code: indicator.code,
                                theme: this.getValueOrEmpty(theme?.displayName),
                                status: this.getValueOrEmpty(status?.displayName),
                                type: "outcomes",
                                scope: scope,
                                group: this.getValueOrEmpty(group?.value),
                                disaggregation: undefined,
                            });
                        })
                        .value();

                    return indicators;
                });

                return indicatorsOutcome;
            });
        });
    }

    private getOutputIndicators(config: D2Config): FutureData<Indicator[]> {
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: {
                    id: true,
                    displayName: true,
                    dataElementGroups: {
                        id: true,
                        code: true,
                        displayName: true,
                        dataElements: {
                            id: true,
                            displayName: true,
                            code: true,
                            categoryCombo: { id: true, displayName: true },
                            dataElementGroups: {
                                id: true,
                                displayName: true,
                                groupSets: { id: true, displayName: true },
                            },
                            attributeValues: { attribute: { id: true }, value: true },
                        },
                    },
                },
                filter: { id: { eq: config.dataElementGroupSets.coreCompetency.id } },
            })
        ).flatMap(d2Response => {
            const coreCompetencyGroup = d2Response.objects[0];
            if (!coreCompetencyGroup)
                return Future.error(new Error("Core competency group not found"));

            const indicators = coreCompetencyGroup?.dataElementGroups.flatMap(deg => {
                const dataElements = _(deg.dataElements)
                    .compactMap((dataElement): Maybe<Indicator> => {
                        const scope = this.getScope(
                            dataElement.dataElementGroups,
                            config,
                            "dataElementGroups"
                        );
                        if (!scope) return undefined;

                        const theme = dataElement.dataElementGroups.find(deg =>
                            deg.groupSets.find(gs => gs.id === config.dataElementGroupSets.theme.id)
                        );

                        const status = dataElement.dataElementGroups.find(deg =>
                            deg.groupSets.find(
                                gs => gs.id === config.dataElementGroupSets.status.id
                            )
                        );

                        const group = dataElement.attributeValues.find(
                            attribute => attribute.attribute.id === config.attributes.group.id
                        );

                        return Indicator.create({
                            denominator: "",
                            numerator: "",
                            coreCompetency: { id: deg.id, code: deg.code, name: deg.displayName },
                            id: dataElement.id,
                            name: dataElement.displayName,
                            code: dataElement.code,
                            theme: this.getValueOrEmpty(theme?.displayName),
                            status: this.getValueOrEmpty(status?.displayName),
                            type: "outputs",
                            scope: scope,
                            group: this.getValueOrEmpty(group?.value),
                            disaggregation: dataElement.categoryCombo
                                ? {
                                      id: dataElement.categoryCombo.id,
                                      name: dataElement.categoryCombo.displayName,
                                  }
                                : undefined,
                            relatedDataElements: [],
                        });
                    })
                    .value();
                return dataElements;
            });

            return Future.success(indicators);
        });
    }

    private getCompetencies(config: D2Config): FutureData<CoreCompetency[]> {
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: {
                    id: true,
                    displayName: true,
                    dataElementGroups: { id: true, code: true, displayName: true },
                },
                filter: { id: { eq: config.dataElementGroupSets.coreCompetency.id } },
            })
        ).flatMap(d2Response => {
            const coreCompetencyGroup = d2Response.objects[0];
            if (!coreCompetencyGroup)
                return Future.error(new Error("Core competency group not found"));
            const competencies = coreCompetencyGroup.dataElementGroups.map(deg => ({
                id: deg.id,
                code: deg.code,
                name: deg.displayName,
            }));
            return Future.success(competencies);
        });
    }

    private getScope(
        d2Groups: Ref[],
        config: D2Config,
        groupType: "dataElementGroups" | "indicatorGroups"
    ): Maybe<Indicator["scope"]> {
        const isCore = d2Groups.some(deg => deg.id === config[groupType].coreIndicator.id);
        const isLocal = d2Groups.some(deg => deg.id === config[groupType].localIndicator.id);
        const isDonor = d2Groups.some(deg => deg.id === config[groupType].donorIndicator.id);

        if (isCore) {
            return "core";
        } else if (isLocal) {
            return "local";
        } else if (isDonor) {
            return "donor";
        } else {
            return undefined;
        }
    }

    private getValueOrEmpty(value: Maybe<string>): string {
        return value ?? "";
    }
}

type D2DataSetSection = {
    id: Id;
    sections: Array<{
        id: Id;
        name: string;
        code: string;
        dataElements: Ref[];
        indicators: Ref[];
    }>;
};
