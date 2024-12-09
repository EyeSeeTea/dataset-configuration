import { FutureData } from "$/domain/entities/generic/Future";
import { Project } from "$/domain/entities/Project";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";

export class GetAllProjectsUseCase {
    constructor(private projectRepository: ProjectRepository) {}

    execute(): FutureData<Project[]> {
        return this.projectRepository.getList();
    }
}
