import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetList } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetRepository, GetDataSetOptions } from "$/domain/repositories/DataSetRepository";

export class GetDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: GetDataSetOptions): FutureData<Paginated<DataSetList>> {
        return this.dataSetRepository.getList(options);
    }
}
