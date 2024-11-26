import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class ValidateNameUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: ValidateNameOptions): FutureData<boolean> {
        return this.dataSetRepository.getByName(options.name).map(dataSets => {
            return dataSets.some(
                dataSet =>
                    dataSet.id !== options.dataSetId &&
                    dataSet.name.toLowerCase() === options.name.toLowerCase()
            );
        });
    }
}
export type ValidateNameOptions = { name: string; dataSetId: Id };
