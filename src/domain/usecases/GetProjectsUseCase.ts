import { FutureData } from "$/data/api-futures";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";

export class GetProjectsUseCase {
    constructor(private projectRepository: ProjectRepository) {}
    execute(options: GetDataSetOptions): FutureData<Paginated<Project>> {
        return this.projectRepository.get(options);
    }
}
