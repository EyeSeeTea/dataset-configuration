import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class RemoveDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(ids: Id[]): FutureData<void> {
        return this.dataSetRepository.delete(ids);
    }
}
