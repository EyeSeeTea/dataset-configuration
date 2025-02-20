import { DataSet } from "$/domain/entities/DataSet";
import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";
import { IndicatorUtils } from "$/domain/usecases/common/IndicatorUtils";

export class GetRelatedDataElementsUseCase {
    private indicatorUtils: IndicatorUtils;

    constructor(private dataElementRepository: DataElementRepository) {
        this.indicatorUtils = new IndicatorUtils(this.dataElementRepository);
    }

    execute(options: Options): FutureData<Indicator[]> {
        return this.indicatorUtils.getDataElementsRelatedFromIndicators(options);
    }
}

type Options = { dataSet: DataSet; indicatorsIdsToIgnore: Id[] };
