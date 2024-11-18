import { FutureData } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { Future } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class DataSetTestRepository implements DataSetRepository {
    getByIds(): FutureData<DataSet[]> {
        throw new Error("Method not implemented.");
    }
    save(): FutureData<void> {
        throw new Error("Method not implemented.");
    }
    remove(): FutureData<void> {
        throw new Error("Method not implemented.");
    }
    get(): FutureData<Paginated<DataSet>> {
        return Future.success({ data: [], page: 1, pageCount: 1, total: 0, pageSize: 10 });
    }
}
