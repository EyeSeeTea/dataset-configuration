import { FutureData } from "$/domain/entities/generic/Future";
import { DataSet } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class GetDataSetsByIdsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(ids: Id[]): FutureData<DataSet[]> {
        return this.dataSetRepository.getByIds(ids);
    }
}
