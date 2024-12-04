import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class ValidateDataSetNameUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: ValidateDataSetNameOptions): FutureData<boolean> {
        return this.dataSetRepository.getByName(options.name).map(dataSets => {
            return dataSets.some(
                dataSet =>
                    dataSet.id !== options.dataSetId &&
                    dataSet.name.toLowerCase() === options.name.toLowerCase()
            );
        });
    }
}
export type ValidateDataSetNameOptions = { name: string; dataSetId: Id };
