import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { getErrors } from "$/domain/entities/generic/Error";

export class SaveDataSetUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(dataSet: DataSet): FutureData<void> {
        const result = dataSet.validateSetup();
        if (result.isError()) {
            const errors = getErrors(result.value.error);
            return Future.error(new Error(errors.join("\n")));
        }

        return this.dataSetRepository.save([dataSet]);
    }
}
