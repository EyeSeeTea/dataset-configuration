import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { DataSetName, DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { DataSetList } from "$/domain/entities/DataSetList";

export class DataSetTestRepository implements DataSetRepository {
    getByName(): FutureData<DataSetName[]> {
        throw new Error("Method not implemented.");
    }
    getList(): FutureData<Paginated<DataSetList>> {
        return Future.success({ data: [], page: 1, pageCount: 1, total: 0, pageSize: 10 });
    }
    getAll(): FutureData<DataSet[]> {
        throw new Error("Method not implemented.");
    }
    getByIds(): FutureData<DataSet[]> {
        return Future.success([]);
    }
    save(): FutureData<void> {
        return Future.void();
    }
    delete(): FutureData<void> {
        throw new Error("Method not implemented.");
    }
}
