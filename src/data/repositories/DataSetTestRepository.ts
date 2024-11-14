import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSet, DataSetList } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";

export class DataSetTestRepository implements DataSetRepository {
    getList(): FutureData<Paginated<DataSetList>> {
        return Future.success({ data: [], page: 1, pageCount: 1, total: 0, pageSize: 10 });
    }
    getAll(): FutureData<DataSet[]> {
        throw new Error("Method not implemented.");
    }
    getByIds(): FutureData<DataSet[]> {
        throw new Error("Method not implemented.");
    }
    save(): FutureData<void> {
        throw new Error("Method not implemented.");
    }
    delete(): FutureData<void> {
        throw new Error("Method not implemented.");
    }
}
