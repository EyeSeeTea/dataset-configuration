import { DataElement } from "$/domain/entities/DataElement";
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
    scope: ScopeType;
    group: string;
    disaggregation: Maybe<NamedRef>;
    coreCompetency: CoreCompetency;
    denominator: string;
    numerator: string;
    relatedDataElements: DataElement[];
};

export type ScopeType = "core" | "local" | "donor";

export class Indicator extends Struct<IndicatorAttrs>() {
    setRelatedDataElements(
        dataElements: DataElement[],
        relatedDataElementsIndicators: HashMap<string, string[]>
    ): Indicator {
        const relatedDataElements = relatedDataElementsIndicators.get(this.id);
        if (!relatedDataElements) return this;
        const dataElementsForIndicator = dataElements.filter(dataElement =>
            relatedDataElements.includes(dataElement.id)
        );
        return this._update({
            relatedDataElements: dataElementsForIndicator,
        });
    }
}
