import { FutureData } from "$/domain/entities/generic/Future";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { Id } from "$/domain/entities/Ref";
import { Stats } from "$/domain/entities/Stats";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";

export interface ProjectRepository {
    get(options: GetDataSetOptions): FutureData<Paginated<Project>>;
    getAll(): FutureData<Project[]>;
    getById(id: Id): FutureData<Project>;
    save(project: Project): FutureData<Stats>;
    getList(options: GetListOptions): FutureData<Project[]>;
}

export type GetListOptions = { includeClosedProjects: boolean };
