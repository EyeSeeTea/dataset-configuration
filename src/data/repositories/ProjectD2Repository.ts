import { D2Api } from "$/types/d2-api";
import { FutureData, apiToFuture } from "$/data/api-futures";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api } from "$/data/repositories/DataSetD2Api";
import { Id } from "$/domain/entities/Ref";
import { DataSet } from "$/domain/entities/DataSet";
import { D2CategoryOptionType } from "$/data/repositories/D2ApiCategoryOption";
import { MetadataItem } from "$/domain/entities/MetadataItem";
import { Future } from "$/domain/entities/generic/Future";

export class ProjectD2Repository implements ProjectRepository {
    private d2DataSetApi: DataSetD2Api;
    constructor(private api: D2Api, private metadata: MetadataItem) {
        this.d2DataSetApi = new DataSetD2Api(this.api, metadata);
    }

    getAll(): FutureData<Project[]> {
        return this.getAllProjects(1, []);
    }

    private getAllProjects(initialPage: number, projects: Project[]): FutureData<Project[]> {
        return this.getProjects(initialPage, 200).flatMap(response => {
            const newProjects = [...projects, ...response.data];
            if (response.page >= response.pageCount) {
                return Future.success(newProjects);
            } else {
                return this.getAllProjects(initialPage + 1, newProjects);
            }
        });
    }

    private getProjects(page: number, pageSize: number) {
        return this.get({
            paging: { page, pageSize },
            filters: {},
            sorting: { field: "lastUpdated", order: "asc" },
        });
    }

    get(options: GetDataSetOptions): FutureData<Paginated<Project>> {
        return apiToFuture(
            this.api.models.categoryOptions.get({
                filter: {
                    "categories.code": { eq: this.metadata.categories.project.code },
                    identifiable: { token: options.filters.search },
                },
                page: options.paging.page,
                pageSize: options.paging.pageSize,
                fields: { id: true, displayName: true, lastUpdated: true },
                order: this.buildOrderParam(options),
            })
        ).flatMap(d2Response => {
            const projects = d2Response.objects.map(d2Category => {
                return this.buildProject(d2Category);
            });

            const projectsIds = projects.map(project => project.id);
            return this.getDataSets(projectsIds).map(dataSets => {
                return {
                    page: d2Response.pager.page,
                    pageCount: d2Response.pager.pageCount,
                    total: d2Response.pager.total,
                    pageSize: d2Response.pager.pageSize,
                    data: this.buildProjectsWithDataSets(projects, dataSets),
                };
            });
        });
    }

    private buildProjectsWithDataSets(projects: Project[], dataSets: DataSet[]): Project[] {
        return projects.map(project => {
            const dataSetsForProject = dataSets.filter(
                dataSet => dataSet.project?.id === project.id
            );
            if (!dataSetsForProject) return project;
            return Project.setDataSets(project, dataSetsForProject);
        });
    }

    private getDataSets(projectsIds: Id[]): FutureData<DataSet[]> {
        return this.d2DataSetApi
            .get({
                paging: { page: 1, pageSize: 1e6 },
                sorting: { field: "lastUpdated", order: "desc" },
                filters: { search: "", projectsIds: projectsIds },
                includeOrgUnits: true,
            })
            .map(response => {
                return response.data;
            });
    }

    private buildProject(d2CategoryOption: D2CategoryOptionType): Project {
        return Project.build({
            id: d2CategoryOption.id,
            name: d2CategoryOption.displayName,
            lastUpdated: d2CategoryOption.lastUpdated,
            dataSets: [],
        });
    }

    private buildOrderParam(options: GetDataSetOptions): string {
        if (!options.sorting.field) return "lastUpdated:desc";
        return `${options.sorting.field}:${options.sorting.order}`;
    }
}
