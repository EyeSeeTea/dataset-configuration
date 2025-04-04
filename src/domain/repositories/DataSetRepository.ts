import { FutureData } from "$/domain/entities/generic/Future";
import { DataSet } from "$/domain/entities/DataSet";
import { Paginated } from "$/domain/entities/Paginated";
import { Id } from "$/domain/entities/Ref";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { DataSetList } from "$/domain/entities/DataSetList";

export interface DataSetRepository {
    getByIds(ids: Id[]): FutureData<DataSet[]>;
    getAll(): FutureData<DataSet[]>;
    getList(options: GetDataSetOptions): FutureData<Paginated<DataSetList>>;
    getByName(name: string): FutureData<DataSetName[]>;
    delete(ids: Id[]): FutureData<void>;
    save(dataSets: DataSetToSave[]): FutureData<void>;
}

export type DataSetOrderFields = keyof Pick<DataSet, "name" | "lastUpdated">;
export type DataSetName = Pick<DataSet, "id" | "name">;

export type GetDataSetOptions = {
    paging: { page: number; pageSize: number };
    sorting: { field: DataSetOrderFields; order: "asc" | "desc" };
    filters: { search?: string; ids?: Id[]; projectsIds?: Id[]; includeDataSets?: boolean };
};
