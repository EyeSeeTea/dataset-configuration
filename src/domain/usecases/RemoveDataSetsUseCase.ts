import { FutureData } from "$/data/api-futures";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class RemoveDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(ids: Id[]): FutureData<void> {
        return this.dataSetRepository.remove(ids);
    }
}
