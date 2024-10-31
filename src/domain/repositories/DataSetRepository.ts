import { FutureData } from "$/domain/entities/generic/Future";
import { DataSet, DataSetToSave } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { Id } from "$/domain/entities/Ref";

export interface DataSetRepository {
    get(options: GetDataSetOptions): FutureData<Paginated<DataSet>>;
    getByIds(ids: Id[]): FutureData<DataSet[]>;
    getAll(): FutureData<DataSet[]>;
    delete(ids: Id[]): FutureData<void>;
    save(dataSets: DataSetToSave[]): FutureData<void>;
}

export type DataSetOrderFields = keyof Pick<DataSet, "name" | "lastUpdated">;

export type GetDataSetOptions = {
    paging: { page: number; pageSize: number };
    sorting: { field: DataSetOrderFields; order: "asc" | "desc" };
    filters: { search?: string; ids?: Id[]; projectsIds?: Id[] };
};
