import { FutureData } from "$/data/api-futures";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";

export class ProjectTestRepository implements ProjectRepository {
    getAll(): FutureData<Project[]> {
        throw new Error("Method not implemented.");
    }
    get(): FutureData<Paginated<Project>> {
        throw new Error("Method not implemented.");
    }
}
