import { IndicatorType } from "$/domain/entities/Indicator";
import { Id, Ref } from "$/domain/entities/Ref";

export type MasterLogFrame = {
    id: Id;
    name: string;
    type: IndicatorType;
    indicators: Ref[];
};
