import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { DataSetUtils, ValidateDataSetNameOptions } from "$/domain/usecases/common/DataSetUtils";

export class ValidateDataSetNameUseCase {
    private dataSetUtils: DataSetUtils;
    constructor(private dataSetRepository: DataSetRepository) {
        this.dataSetUtils = new DataSetUtils(this.dataSetRepository);
    }

    execute(options: ValidateDataSetNameOptions): FutureData<boolean> {
        return this.dataSetUtils.dataSetNameExists(options);
    }
}
