import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";

export interface IndicatorRepository {
    get(): FutureData<Indicator[]>;
    getByDataSetId(dataSetId: Id): FutureData<Indicator[]>;
}
