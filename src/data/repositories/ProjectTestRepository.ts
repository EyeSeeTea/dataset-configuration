import { FutureData } from "$/domain/entities/generic/Future";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";

export class ProjectTestRepository implements ProjectRepository {
    getList(): FutureData<Project[]> {
        throw new Error("Method not implemented.");
    }
    getAll(): FutureData<Project[]> {
        throw new Error("Method not implemented.");
    }
    get(): FutureData<Paginated<Project>> {
        throw new Error("Method not implemented.");
    }
}
