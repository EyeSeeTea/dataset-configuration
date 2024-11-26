import { FutureData } from "$/domain/entities/generic/Future";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";

export interface ProjectRepository {
    get(options: GetDataSetOptions): FutureData<Paginated<Project>>;
    getAll(): FutureData<Project[]>;
    getList(): FutureData<Project[]>;
}
