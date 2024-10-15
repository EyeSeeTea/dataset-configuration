import { FutureData } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { Id } from "$/domain/entities/Ref";

export interface DataSetRepository {
    get(options: GetDataSetOptions): FutureData<Paginated<DataSet>>;
    getByIds(ids: Id[]): FutureData<DataSet[]>;
    remove(ids: Id[]): FutureData<void>;
    save(dataSets: DataSet[]): FutureData<void>;
}

export type GetDataSetOptions = {
    paging: { page: number; pageSize: number };
    sorting: { field: string; order: "asc" | "desc" };
    filters: { search?: string; ids?: Id[] };
};
