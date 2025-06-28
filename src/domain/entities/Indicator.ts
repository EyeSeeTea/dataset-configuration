import _ from "$/domain/entities/generic/Collection";
import { Category } from "$/domain/entities/Category";
import { COMMENT_SUFIX, DataElement } from "$/domain/entities/DataElement";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { Code, Id, ISODateString, NamedRef, Ref } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { Struct } from "$/domain/entities/generic/Struct";
import { LowercaseString, Maybe, UnionFromValues } from "$/utils/ts-utils";
import {
    CompanionRule,
    buildCompanionRuleMessage,
    evaluateRule,
    getIndicatorCodes,
} from "$/domain/entities/CompanionRule";

export type Disaggregation = {
    id: Id;
    name: string;
    categories: Category[];
    optionsCombos: Array<NamedRef & { categoryCombo: Ref; options: NamedRef[] }>;
};

export type IndicatorCompanionScope = string;
export type IndicatorCompanionRule =
    | { type: "global"; rule: CompanionRule }
    | { type: "scoped"; rules: { [scope: IndicatorCompanionScope]: CompanionRule } };

export type IndicatorAttrs = {
    id: Id;
    description: string;
    name: string;
    code: string;
    theme: string;
    status: string;
    type: IndicatorType;
    measure: string;
    scope: IndicatorScope;
    group: string;
    disaggregation: Maybe<Disaggregation>;
    initialDisaggregation: Maybe<Disaggregation>;
    coreCompetency: CoreCompetency;
    denominator: string;
    numerator: string;
    relatedDataElements: DataElement[];
    categories: Category[];
    valueType: string;
    companionRules: Maybe<{
        outcomeRule: Maybe<IndicatorCompanionRule>;
        outputRule: Maybe<IndicatorCompanionRule>;
    }>;
};

export type IndicatorScope = "mandatory" | "local" | "donor" | "suggested";
export const indicatorTypes = ["outputs", "outcomes"] as const;
export type IndicatorType = UnionFromValues<typeof indicatorTypes>;

export class Indicator extends Struct<IndicatorAttrs>() {
    get combinations() {
        switch (this.type) {
            case "outputs": {
                return [
                    this.generateCombination(
                        this.disaggregation,
                        [
                            {
                                categories: this.categories,
                                code: this.code,
                                name: this.name,
                                id: this.id,
                                isComment: false,
                                disaggregation: this.disaggregation,
                                description: this.description,
                                valueType: this.valueType,
                                initialDisaggregation: this.initialDisaggregation,
                            },
                        ],
                        this.type
                    ),
                ];
            }
            case "outcomes": {
                const commentsDataElements = this.relatedDataElements.filter(
                    dataElement => dataElement.isComment
                );
                const commentCombination = commentsDataElements.map(dataElement => {
                    return this.generateCombination(
                        dataElement.disaggregation,
                        [dataElement],
                        this.type
                    );
                });

                // getting the first dataElement because all the no comment
                // dataElements share the same disaggregation
                const relatedDataElements = this.relatedDataElements.filter(
                    dataElement => !dataElement.isComment
                );
                const firstDataElement = relatedDataElements[0];

                const firstCombination = firstDataElement
                    ? this.generateCombination(
                          firstDataElement.disaggregation,
                          relatedDataElements,
                          this.type
                      )
                    : undefined;

                return _([...commentCombination, firstCombination])
                    .compact()
                    .value();
            }
        }
    }

    get isIndividual() {
        return this.measure?.toLowerCase() === "individuals";
    }

    get isHousehold() {
        return this.measure?.toLocaleLowerCase() === "households";
    }

    private generateCombination(
        disaggregation: DataElement["disaggregation"],
        dataElements: DataElement[],
        type: IndicatorType
    ): IndicatorCombination {
        return {
            dataElements: dataElements.map(dataElement => {
                return {
                    ...dataElement,
                    disaggregation: dataElement.disaggregation,
                    categories: dataElement.categories,
                    coreCompetency: this.coreCompetency,
                    type,
                };
            }),
            coreCompetency: this.coreCompetency,
            id: disaggregation?.id ?? "",
            name: disaggregation?.name ?? "",
            categories: disaggregation?.categories ?? [],
            type,
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
        const dataElementByIndicator = _(this.buildListDataElements(indicators)).groupBy(
            dataElement => dataElement.indicator.id
        );

        return indicators.flatMap((indicator): IndicatorWithDataElement[] => {
            switch (indicator.type) {
                case "outcomes": {
                    const dataElements = dataElementByIndicator.get(indicator.id) ?? [];
                    const commentDataElement = dataElements.find(
                        dataElement => dataElement.isComment
                    );

                    const relatedDataElements = dataElements.filter(
                        dataElement => !dataElement.isComment
                    );

                    const indicatorComment = commentDataElement
                        ? {
                              indicator: indicator,
                              dataElements: commentDataElement ? [commentDataElement] : [],
                          }
                        : undefined;

                    const indicatorRelatedDataElements: Maybe<IndicatorWithDataElement> = {
                        indicator,
                        dataElements: relatedDataElements,
                    };

                    return _([indicatorComment, indicatorRelatedDataElements]).compact().value();
                }
                case "outputs": {
                    return [
                        {
                            indicator,
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
                                    initialDisaggregation: indicator.initialDisaggregation,
                                },
                            ],
                        },
                    ];
                }
            }
        });
    }

    static buildListDataElements(indicators: Indicator[]): DataElementIndicator[] {
        const allDataElements = indicators
            .filter(indicator => indicator.type === "outcomes")
            .flatMap((indicator): DataElementIndicator[] => {
                return indicator.relatedDataElements.map(dataElement => {
                    return {
                        id: dataElement.id,
                        name: dataElement.name,
                        code: dataElement.code,
                        isComment: dataElement.isComment,
                        categories: dataElement.categories,
                        description: dataElement.description,
                        valueType: dataElement.valueType,
                        initialDisaggregation: dataElement.initialDisaggregation,
                        disaggregation: dataElement.disaggregation,
                        indicator: indicator,
                    };
                });
            });

        const outputDataElements = indicators
            .filter(indicator => indicator.type === "outputs")
            .map((indicator): DataElementIndicator => {
                return {
                    id: indicator.id,
                    name: indicator.name,
                    code: indicator.code,
                    isComment: false,
                    categories: indicator.categories,
                    description: indicator.description,
                    valueType: indicator.valueType,
                    initialDisaggregation: indicator.initialDisaggregation,
                    disaggregation: indicator.disaggregation,
                    indicator: indicator,
                };
            });

        const outcomeDataElements = _(allDataElements)
            .uniqBy(dataElement => dataElement.id)
            .value();

        return outputDataElements.concat(outcomeDataElements);
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

    getAllCompanionCodesFromRules(): Code[] {
        const outcomeCodes = this.getCompanionCodesByType("outcome");
        const outputCodes = this.getCompanionCodesByType("output");
        return _([...outcomeCodes.values(), ...outputCodes.values()])
            .flatten()
            .uniq()
            .value();
    }

    getCompanionCodesScope(): HashMap<Code, IndicatorCompanionScope[]> {
        const outcomeCodes = this.getCompanionCodesByType("outcome");
        const outputCodes = this.getCompanionCodesByType("output");
        return _([...outcomeCodes.keys(), ...outputCodes.keys()])
            .uniq()
            .flatMap(scope => {
                return _([...(outcomeCodes.get(scope) ?? []), ...(outputCodes.get(scope) ?? [])])
                    .uniq()
                    .map(code => [code, scope] as [Code, IndicatorCompanionScope]);
            })
            .groupFromMap(([code, scope]) => [code, scope]);
    }

    getCompanionCodesByType(type: "output" | "outcome"): HashMap<string, Code[]> {
        const rule =
            type === "outcome" ? this.companionRules?.outcomeRule : this.companionRules?.outputRule;

        if (!rule) return HashMap.empty();

        return processCompanionRuleByScope(rule, getIndicatorCodes);
    }

    getCompanionScopes(): IndicatorCompanionScope[] {
        const outcomeScopes = this.companionRules?.outcomeRule
            ? this.getIndicatorCompanionScopes(this.companionRules.outcomeRule)
            : [];
        const outputScopes = this.companionRules?.outputRule
            ? this.getIndicatorCompanionScopes(this.companionRules.outputRule)
            : [];
        return _(outcomeScopes).concat(outputScopes).uniq().value();
    }

    private getIndicatorCompanionScopes(
        indicatorCompanionRule: IndicatorCompanionRule
    ): IndicatorCompanionScope[] {
        return indicatorCompanionRule.type === "scoped"
            ? Object.keys(indicatorCompanionRule.rules)
            : ["default"];
    }

    static getIndicatorCompanionScope(date: Maybe<ISODateString>): IndicatorCompanionScope {
        if (!date) return "default";
        return new Date(date).getFullYear().toString();
    }

    validateCompanionRules(indicatorByCodes: HashMap<LowercaseString, Indicator>): {
        outcomeRulesValid: HashMap<IndicatorCompanionScope, boolean>;
        outputRulesValid: HashMap<IndicatorCompanionScope, boolean>;
    } {
        const evaluateIndicatorRule = (rule: CompanionRule) => evaluateRule(rule, indicatorByCodes);
        const outcomeRuleIsValid: HashMap<IndicatorCompanionScope, boolean> = this.companionRules
            ?.outcomeRule
            ? processCompanionRuleByScope(this.companionRules.outcomeRule, evaluateIndicatorRule)
            : HashMap.empty();

        const outputRuleIsValid: HashMap<IndicatorCompanionScope, boolean> = this.companionRules
            ?.outputRule
            ? processCompanionRuleByScope(this.companionRules.outputRule, evaluateIndicatorRule)
            : HashMap.empty();

        return { outcomeRulesValid: outcomeRuleIsValid, outputRulesValid: outputRuleIsValid };
    }

    buildCompanionRuleMessage(): {
        outcomeMessages: HashMap<IndicatorCompanionScope, string>;
        outputMessages: HashMap<IndicatorCompanionScope, string>;
    } {
        const outcomeMessage: HashMap<IndicatorCompanionScope, string> = this.companionRules
            ?.outcomeRule
            ? processCompanionRuleByScope(
                  this.companionRules.outcomeRule,
                  buildCompanionRuleMessage
              )
            : HashMap.empty();
        const outputMessage: HashMap<IndicatorCompanionScope, string> = this.companionRules
            ?.outputRule
            ? processCompanionRuleByScope(this.companionRules.outputRule, buildCompanionRuleMessage)
            : HashMap.empty();

        return { outcomeMessages: outcomeMessage, outputMessages: outputMessage };
    }

    private static extractId(string: string, re: RegExp): Id[] {
        const globalRe = new RegExp(re, "g");
        return _(Array.from(string.matchAll(globalRe), match => match[1]))
            .compactMap(item => item)
            .value();
    }
}

export type IndicatorWithDataElement = { indicator: Indicator; dataElements: DataElement[] };

export type IndicatorCombination = {
    id: Id;
    name: string;
    categories: Category[];
    dataElements: DataElementWithCompetency[];
    coreCompetency: CoreCompetency;
    type: "outputs" | "outcomes";
};

export type DataElementWithCompetency = DataElement & {
    coreCompetency: CoreCompetency;
    type: IndicatorType;
};

type DataElementIndicator = DataElement & { indicator: Indicator };

function processCompanionRuleByScope<T>(
    companionRule: IndicatorCompanionRule,
    fn: (rule: CompanionRule) => T
): HashMap<IndicatorCompanionScope, T> {
    if (companionRule.type === "global") {
        return HashMap.fromObject({
            default: fn(companionRule.rule),
        });
    } else if (companionRule.type === "scoped") {
        return _(Object.entries(companionRule.rules))
            .map(([scope, rule]) => ({ scope, processedRules: fn(rule) }))
            .toHashMap((result: { scope: string; processedRules: T }) => [
                result.scope,
                result.processedRules,
            ]);
    }
    return HashMap.empty();
}
