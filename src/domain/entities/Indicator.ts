import _ from "$/domain/entities/generic/Collection";
import { Category } from "$/domain/entities/Category";
import { COMMENT_PREFIX, DataElement } from "$/domain/entities/DataElement";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { Struct } from "$/domain/entities/generic/Struct";
import { Maybe } from "$/utils/ts-utils";

export type IndicatorAttrs = {
    id: Id;
    name: string;
    code: string;
    theme: string;
    status: string;
    type: "outputs" | "outcomes";
    scope: IndicatorScope;
    group: string;
    disaggregation: Maybe<NamedRef & { categories: Category[] }>;
    coreCompetency: CoreCompetency;
    denominator: string;
    numerator: string;
    relatedDataElements: DataElement[];
    categories: Category[];
};

export type IndicatorScope = "core" | "local" | "donor";

export class Indicator extends Struct<IndicatorAttrs>() {
    setRelatedDataElements(
        dataElements: DataElement[],
        relatedDataElementsIndicators: HashMap<string, string[]>
    ): Indicator {
        const relatedDataElements = relatedDataElementsIndicators.get(this.id);
        if (!relatedDataElements || this.relatedDataElements.length > 0) return this;
        const dataElementsForIndicator = dataElements.filter(dataElement =>
            relatedDataElements.includes(dataElement.isComment ? dataElement.code : dataElement.id)
        );
        return this._update({
            relatedDataElements: dataElementsForIndicator.map(dataElement => {
                return { ...dataElement };
            }),
        });
    }

    static buildAllIndicators(indicators: Indicator[]): IndicatorWithDataElement[] {
        return indicators.flatMap((indicator): IndicatorWithDataElement[] => {
            if (indicator.type === "outcomes") {
                const commentDataElement = indicator.relatedDataElements.find(
                    dataElement => dataElement.isComment
                );
                const relatedDataElements = indicator.relatedDataElements.filter(
                    dataElement => !dataElement.isComment
                );
                const indicatorComment = commentDataElement
                    ? {
                          indicator: indicator,
                          dataElements: commentDataElement ? [commentDataElement] : [],
                      }
                    : undefined;

                const indicatorRelatedDataElements = {
                    indicator,
                    dataElements: relatedDataElements,
                };

                return _([indicatorComment, indicatorRelatedDataElements]).compact().value();
            } else {
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
                            },
                        ],
                    },
                ];
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
            dataElement.name.includes(search)
        );
        const filteredIndicators = indicators.map(indicator => ({
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
        const dataElementCode = indicator.code ? [`${indicator.code}${COMMENT_PREFIX}`] : [];
        return [...idsInNumerator, ...idsInDenominator, ...dataElementCode];
    }

    private static extractId(string: string, re: RegExp): Id[] {
        const globalRe = new RegExp(re, "g");
        return _(Array.from(string.matchAll(globalRe), match => match[1]))
            .compactMap(item => item)
            .value();
    }
}

export type IndicatorWithDataElement = { indicator: Indicator; dataElements: DataElement[] };
