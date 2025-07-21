import { Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";

export type IndicatorMatchAttrs = {
    target: Id;
    source: Id;
};

export class IndicatorMatch extends Struct<IndicatorMatchAttrs>() {
    get resolvedExpression(): string {
        return `#{${this.source}}`;
    }
    get sourceIds(): Id[] {
        return [this.source];
    }
}
