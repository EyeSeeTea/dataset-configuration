import { apiToFuture } from "$/data/api-futures";
import { D2Config } from "$/data/repositories/D2ApiMetadata";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Indicator, IndicatorScope } from "$/domain/entities/Indicator";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { Id, Ref } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { convertToCategories } from "$/data/utils";

export class D2ApiIndicator {
    constructor(private api: D2Api) {}

    getOutcomeIndicators(config: D2Config): FutureData<Indicator[]> {
        return this.getCompetencies(config).flatMap(competencies => {
            const competenciesNames = competencies.map(c => c.name);
            return this.getIndicatorGroupsByCompetencies(competenciesNames).map(d2Response => {
                return d2Response.objects.flatMap(indicatorGroup => {
                    return this.buildOutcomeIndicators(competencies, indicatorGroup, config);
                });
            });
        });
    }

    getOutputIndicators(config: D2Config): FutureData<Indicator[]> {
        return this.getCompetencies(config).flatMap(competencies => {
            return apiToFuture(
                this.api.models.dataElementGroups.get({
                    fields: { id: true, name: true, dataElements: true },
                    filter: { id: { in: competencies.map(competency => competency.id) } },
                    paging: false,
                })
            ).flatMap(d2ResponseGroups => {
                const allDataElementIds = d2ResponseGroups.objects.flatMap(group =>
                    group.dataElements.map(de => de.id)
                );

                const $requests = _(allDataElementIds)
                    .chunk(300)
                    .map(dataElementIds => {
                        return this.buildIndicators(dataElementIds, competencies, config);
                    })
                    .value();

                const options = { concurrency: 8 };
                return Future.parallel($requests, options).map(indicators => indicators.flat());
            });
        });
    }

    private buildIndicators(
        dataElementIds: string[],
        competencies: CoreCompetency[],
        config: D2Config
    ): FutureData<Indicator[]> {
        return this.getDataElementsByIds(dataElementIds).map(d2ResponseDataElements => {
            return _(d2ResponseDataElements.objects)
                .compactMap((d2DataElement): Maybe<Indicator> => {
                    const groupsById = _(d2DataElement.dataElementGroups).keyBy(x => x.id);

                    const competency = competencies.find(competency =>
                        groupsById.get(competency.id)
                    );

                    if (!competency) return undefined;

                    return this.buildOutputIndicator(competency, d2DataElement, config);
                })
                .value();
        });
    }

    private getDataElementsByIds(ids: Id[]) {
        return apiToFuture(
            this.api.models.dataElements.get({
                filter: { id: { in: ids } },
                fields: {
                    id: true,
                    displayName: true,
                    displayDescription: true,
                    valueType: true,
                    code: true,
                    categoryCombo: {
                        id: true,
                        displayName: true,
                        categories: {
                            id: true,
                            name: true,
                            displayName: true,
                            categoryOptions: { id: true, displayName: true },
                        },
                    },
                    attributeValues: { attribute: { id: true }, value: true },
                    dataElementGroups: {
                        id: true,
                        displayName: true,
                        groupSets: { id: true, displayName: true },
                    },
                },
                paging: false,
            })
        );
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
    ): Maybe<IndicatorScope> {
        const isMandatory = d2Groups.some(deg => deg.id === config[groupType].coreIndicator.id);
        const isLocal = d2Groups.some(deg => deg.id === config[groupType].localIndicator.id);
        const isDonor = d2Groups.some(deg => deg.id === config[groupType].donorIndicator.id);

        if (isMandatory) {
            return "mandatory";
        } else if (isLocal) {
            return "local";
        } else if (isDonor) {
            return "donor";
        } else {
            return "suggested";
        }
    }

    private getValueOrEmpty(value: Maybe<string>): string {
        return value ?? "";
    }

    private getIndicatorGroupsByCompetencies(competencies: string[]) {
        return apiToFuture(
            this.api.models.indicatorGroups.get({
                fields: {
                    id: true,
                    code: true,
                    name: true,
                    displayName: true,
                    indicators: {
                        code: true,
                        displayDescription: true,
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
                filter: { name: { in: competencies } },
            })
        );
    }

    private buildOutcomeIndicators(
        competencies: CoreCompetency[],
        indicatorGroup: D2IndicatorGroup,
        config: D2Config
    ): Indicator[] {
        const competency = competencies.find(
            c => c.name.toLowerCase() === indicatorGroup.name.toLowerCase()
        );
        if (!competency) return [];

        return _(indicatorGroup.indicators)
            .compactMap(indicator => {
                const scope = this.getScope(indicator.indicatorGroups, config, "indicatorGroups");
                if (!scope) return undefined;

                const theme = indicator.indicatorGroups.find(
                    ig => ig.indicatorGroupSet.id === config.indicatorGroupSets.theme.id
                );
                const status = indicator.indicatorGroups.find(
                    ig => ig.indicatorGroupSet.id === config.indicatorGroupSets.status.id
                );
                const group = indicator.attributeValues.find(
                    attribute => attribute.attribute.id === config.attributes.group.id
                );

                return Indicator.create({
                    measure: "",
                    valueType: "",
                    description: indicator.displayDescription,
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
                    group: group?.value ?? indicator.displayName,
                    disaggregation: undefined,
                    initialDisaggregation: undefined,
                    categories: [],
                });
            })
            .value();
    }

    private getDataElementGroupsByCompetencies(coreCompetencyId: string) {
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
                            displayDescription: true,
                            valueType: true,
                            code: true,
                            categoryCombo: {
                                id: true,
                                displayName: true,
                                categories: {
                                    id: true,
                                    name: true,
                                    displayName: true,
                                    categoryOptions: { id: true, displayName: true },
                                },
                            },
                            dataElementGroups: {
                                id: true,
                                displayName: true,
                                groupSets: { id: true, displayName: true },
                            },
                            attributeValues: { attribute: { id: true }, value: true },
                        },
                    },
                },
                filter: { id: { eq: coreCompetencyId } },
            })
        );
    }

    private buildOutputIndicator(
        coreCompetency: CoreCompetency,
        dataElement: D2DataElementFromGroup,
        config: D2Config
    ): Maybe<Indicator> {
        const isOutPut = dataElement.dataElementGroups.some(
            deg => deg.id === config.dataElementGroups.outputIndicator.id
        );
        if (!isOutPut) return undefined;

        const scope = this.getScope(dataElement.dataElementGroups, config, "dataElementGroups");
        if (!scope) return undefined;

        const theme = dataElement.dataElementGroups.find(deg =>
            deg.groupSets.find(gs => gs.id === config.dataElementGroupSets.theme.id)
        );

        const status = dataElement.dataElementGroups.find(deg =>
            deg.groupSets.find(gs => gs.id === config.dataElementGroupSets.status.id)
        );

        const group = dataElement.attributeValues.find(
            attribute => attribute.attribute.id === config.attributes.group.id
        );

        const measure = dataElement.dataElementGroups.find(deg =>
            deg.groupSets.find(gs => gs.id === config.dataElementGroupSets.measure.id)
        );

        const disaggregation = dataElement.categoryCombo
            ? {
                  id: dataElement.categoryCombo.id,
                  name: dataElement.categoryCombo.displayName,
                  categories: convertToCategories(dataElement.categoryCombo.categories),
                  optionsCombos: [],
              }
            : undefined;

        return Indicator.create({
            measure: this.getValueOrEmpty(measure?.displayName),
            valueType: dataElement.valueType,
            description: dataElement.displayDescription,
            denominator: "",
            numerator: "",
            coreCompetency: coreCompetency,
            id: dataElement.id,
            name: dataElement.displayName,
            code: dataElement.code,
            theme: this.getValueOrEmpty(theme?.displayName),
            status: this.getValueOrEmpty(status?.displayName),
            type: "outputs",
            scope: scope,
            group: this.getValueOrEmpty(group?.value),
            disaggregation: disaggregation,
            initialDisaggregation: disaggregation,
            relatedDataElements: [],
            categories: [],
        });
    }
}

type D2IndicatorGroup = {
    id: Id;
    name: string;
    displayName: string;
    indicators: Array<{
        displayDescription: string;
        code: string;
        attributeValues: Array<{ attribute: { id: Id }; value: string }>;
        denominator: string;
        displayName: string;
        id: Id;
        indicatorGroups: Array<{
            displayName: string;
            id: Id;
            indicatorGroupSet: { id: Id; displayName: string };
        }>;
        numerator: string;
    }>;
};

type D2DataElementFromGroup = {
    id: Id;
    displayName: string;
    displayDescription: string;
    valueType: string;
    code: string;
    categoryCombo: {
        id: Id;
        displayName: string;
        categories: Array<{
            id: Id;
            name: string;
            displayName: string;
            categoryOptions: Array<{ id: Id; displayName: string }>;
        }>;
    };
    dataElementGroups: Array<{
        id: Id;
        displayName: string;
        groupSets: Array<{ id: Id; displayName: string }>;
    }>;
    attributeValues: Array<{ attribute: { id: Id }; value: string }>;
};
