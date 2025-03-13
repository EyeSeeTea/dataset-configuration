import _ from "$/domain/entities/generic/Collection";
import { Category } from "$/domain/entities/Category";
import { COMMENT_SUFIX, DataElement } from "$/domain/entities/DataElement";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { Id, NamedRef, Ref } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { Struct } from "$/domain/entities/generic/Struct";
import { Maybe } from "$/utils/ts-utils";

export type DisaggregationAttrs = {
    id: Id;
    name: string;
    categories: Category[];
    optionsCombos: Array<NamedRef & { categoryCombo: Ref; options: NamedRef[] }>;
};

export type IndicatorAttrs = {
    id: Id;
    description: string;
    name: string;
    code: string;
    theme: string;
    status: string;
    type: "outputs" | "outcomes";
    measure: Maybe<IndicatorMeasure>;
    scope: IndicatorScope;
    group: string;
    disaggregation: Maybe<DisaggregationAttrs>;
    coreCompetency: CoreCompetency;
    denominator: string;
    numerator: string;
    relatedDataElements: DataElement[];
    categories: Category[];
    valueType: string;
};

export type IndicatorScope = "global" | "local" | "donor";
export type IndicatorMeasure = "individuals" | "households";

export class Indicator extends Struct<IndicatorAttrs>() {
    get combinations() {
        switch (this.type) {
            case "outputs": {
                return [
                    this.generateCombination(this.disaggregation, [
                        {
                            categories: this.categories,
                            code: this.code,
                            name: this.name,
                            id: this.id,
                            isComment: false,
                            disaggregation: this.disaggregation,
                            description: this.description,
                            valueType: this.valueType,
                        },
                    ]),
                ];
            }
            case "outcomes": {
                const commentsDataElements = this.relatedDataElements.filter(
                    dataElement => dataElement.isComment
                );
                const commentCombination = commentsDataElements.map(dataElement => {
                    return this.generateCombination(dataElement.disaggregation, [dataElement]);
                });

                // getting the first dataElement because all the no comment
                // dataElements share the same disaggregation
                const relatedDataElements = this.relatedDataElements.filter(
                    dataElement => !dataElement.isComment
                );
                const firstDataElement = relatedDataElements[0];

                const firstCombination = firstDataElement
                    ? this.generateCombination(firstDataElement.disaggregation, relatedDataElements)
                    : undefined;

                return _([...commentCombination, firstCombination])
                    .compact()
                    .value();
            }
        }
    }

    private generateCombination(
        disaggregation: DataElement["disaggregation"],
        dataElements: DataElement[]
    ): IndicatorCombination {
        return {
            dataElements: dataElements.map(dataElement => {
                return {
                    ...dataElement,
                    disaggregation: dataElement.disaggregation,
                    categories: dataElement.categories,
                    coreCompetency: this.coreCompetency,
                };
            }),
            coreCompetency: this.coreCompetency,
            id: disaggregation?.id ?? "",
            name: disaggregation?.name ?? "",
            categories: disaggregation?.categories ?? [],
        };
    }

    setRelatedDataElements(
        dataElements: DataElement[],
        relatedDataElementsIndicators: HashMap<string, string[]>
    ): Indicator {
        const relatedDataElements = relatedDataElementsIndicators.get(this.id);
        if (!relatedDataElements || this.relatedDataElements.length > 0) return this;
        const dataElementsForIndicator = dataElements.filter(dataElement =>
            relatedDataElements.includes(dataElement.isComment ? dataElement.code : dataElement.id)
        );
        return this._update({ relatedDataElements: dataElementsForIndicator });
    }

    static buildAllIndicators(indicators: Indicator[]): IndicatorWithDataElement[] {
        return indicators.flatMap((indicator): IndicatorWithDataElement[] => {
            switch (indicator.type) {
                case "outcomes": {
                    const commentDataElement = indicator.relatedDataElements.find(
                        dataElement => dataElement.isComment
                    );
                    const commentDisaggregation = commentDataElement?.disaggregation;

                    const relatedDataElements = indicator.relatedDataElements.filter(
                        dataElement => !dataElement.isComment
                    );

                    const relatedDisaggregation = relatedDataElements[0]?.disaggregation;

                    const indicatorComment = commentDataElement
                        ? {
                              indicator: indicator,
                              originalDisaggregation: commentDisaggregation,
                              dataElements: commentDataElement ? [commentDataElement] : [],
                          }
                        : undefined;

                    const indicatorRelatedDataElements: Maybe<IndicatorWithDataElement> = {
                        indicator,
                        originalDisaggregation: relatedDisaggregation,
                        dataElements: relatedDataElements,
                    };

                    return _([indicatorComment, indicatorRelatedDataElements]).compact().value();
                }
                case "outputs": {
                    return [
                        {
                            indicator,
                            originalDisaggregation: indicator.disaggregation,
                            dataElements: [
                                {
                                    id: indicator.id,
                                    name: indicator.name,
                                    code: indicator.code,
                                    disaggregation: indicator.disaggregation,
                                    isComment: false,
                                    categories: indicator.categories,
                                    description: indicator.description,
                                    valueType: indicator.valueType,
                                },
                            ],
                        },
                    ];
                }
            }
        });
    }

    static filterIndicatorDataElements(
        indicators: IndicatorWithDataElement[],
        search: string
    ): IndicatorWithDataElement[] {
        if (!search) return indicators;
        const allDataElements = indicators.flatMap(indicator => indicator.dataElements);
        const filteredDataElements = allDataElements.filter(dataElement =>
            dataElement.name.toLowerCase().includes(search.toLowerCase())
        );
        const filteredIndicators = indicators.map(indicator => ({
            ...indicator,
            indicator: indicator.indicator,
            dataElements: indicator.dataElements.filter(dataElement =>
                filteredDataElements.includes(dataElement)
            ),
        }));
        return filteredIndicators.filter(indicator => indicator.dataElements.length > 0);
    }

    static extractDataElementsReferences(indicator: Indicator): string[] {
        const idsInNumerator = this.extractId(indicator.numerator, /#{(\w+)/);
        const idsInDenominator = this.extractId(indicator.denominator, /#{(\w+)/);
        const dataElementCode = indicator.code ? [`${indicator.code}${COMMENT_SUFIX}`] : [];
        return [...idsInNumerator, ...idsInDenominator, ...dataElementCode];
    }

    private static extractId(string: string, re: RegExp): Id[] {
        const globalRe = new RegExp(re, "g");
        return _(Array.from(string.matchAll(globalRe), match => match[1]))
            .compactMap(item => item)
            .value();
    }
}

export type IndicatorWithDataElement = {
    originalDisaggregation: Maybe<DisaggregationAttrs>;
    indicator: Indicator;
    dataElements: DataElement[];
};

export type IndicatorCombination = {
    id: Id;
    name: string;
    categories: Category[];
    dataElements: Array<DataElement & { coreCompetency: CoreCompetency }>;
    coreCompetency: CoreCompetency;
};
