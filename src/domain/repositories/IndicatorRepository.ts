import { Indicator } from "$/domain/entities/Indicator";
import { FutureData } from "$/domain/entities/generic/Future";

export interface IndicatorRepository {
    get(): FutureData<Indicator[]>;
}
