import { FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";

export class IndicatorTestRepository implements IndicatorRepository {
    get(): FutureData<Indicator[]> {
        throw new Error("Method not implemented.");
    }
}
