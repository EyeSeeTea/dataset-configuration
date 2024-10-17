import { FutureData } from "$/data/api-futures";
import { DataSet } from "$/domain/entities/DataSet";
import { Future } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import _ from "$/domain/entities/generic/Collection";
import { Project } from "$/domain/entities/Project";

export class MigrateDataSetProjectsUseCase {
    constructor(
        private dataSetRepository: DataSetRepository,
        private projectRepository: ProjectRepository
    ) {}

    execute(): FutureData<MigrateResponse> {
        return Future.joinObj({
            dataSets: this.getAllDataSets(),
            projects: this.projectRepository.getAll(),
        }).flatMap(({ dataSets, projects }) => {
            const allDataSets = this.assignProjectsToDataSets(dataSets, projects);
            const dataSetsWithProjects = allDataSets.filter(ds => ds.project);
            const dataSetsWithoutProjects = allDataSets.filter(ds => !ds.project);
            console.debug("DataSets with projects", dataSetsWithProjects.length);
            console.debug("DataSets without projects", dataSetsWithoutProjects.length);
            console.debug(`Saving ${dataSetsWithProjects.length} dataSets...`);
            return this.dataSetRepository.save(dataSetsWithProjects).map(() => {
                return { dataSetsWithProjects, dataSetsWithoutProjects };
            });
        });
    }

    private assignProjectsToDataSets(dataSets: DataSet[], projects: Project[]): DataSet[] {
        return _(dataSets)
            .map(dataSet => {
                const project = projects.find(project => dataSet.name.includes(project.name));
                return DataSet.create({ ...dataSet, project });
            })
            .value();
    }

    private getAllDataSets(): FutureData<DataSet[]> {
        console.debug("Loading dataSets and projects...");
        return this.dataSetRepository.getAll();
    }
}

export type MigrateResponse = {
    dataSetsWithProjects: DataSet[];
    dataSetsWithoutProjects: DataSet[];
};
