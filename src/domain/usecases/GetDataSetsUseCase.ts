import { FutureData } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetRepository, GetDataSetOptions } from "$/domain/repositories/DataSetRepository";

export class GetDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: GetDataSetOptions): FutureData<Paginated<DataSet>> {
        return this.dataSetRepository.get(options);
    }
}
