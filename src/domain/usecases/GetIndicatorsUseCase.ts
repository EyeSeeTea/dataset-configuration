import { Indicator } from "$/domain/entities/Indicator";
import { FutureData } from "$/domain/entities/generic/Future";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";

export class GetIndicatorsUseCase {
    constructor(private indicatorRepository: IndicatorRepository) {}

    public execute(): FutureData<Indicator[]> {
        return this.indicatorRepository.get();
    }
}
