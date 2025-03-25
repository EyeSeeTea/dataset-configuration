import { FutureData } from "$/domain/entities/generic/Future";
import { Project } from "$/domain/entities/Project";
import { GetListOptions, ProjectRepository } from "$/domain/repositories/ProjectRepository";

export class GetAllProjectsUseCase {
    constructor(private projectRepository: ProjectRepository) {}

    execute(options: GetListOptions): FutureData<Project[]> {
        return this.projectRepository.getList(options);
    }
}
