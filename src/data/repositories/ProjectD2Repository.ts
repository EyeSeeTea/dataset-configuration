import { D2Api } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { Paginated } from "$/domain/entities/Paginated";
import { Project } from "$/domain/entities/Project";
import { GetDataSetOptions } from "$/domain/repositories/DataSetRepository";
import { GetListOptions, ProjectRepository } from "$/domain/repositories/ProjectRepository";
import _ from "$/domain/entities/generic/Collection";
import { DataSetD2Api } from "$/data/repositories/DataSetD2Api";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { DataSet } from "$/domain/entities/DataSet";
import {
    D2CategoryOptionType,
    D2CategoryOptionWithDates,
} from "$/data/repositories/D2ApiCategoryOption";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import { Maybe } from "$/utils/ts-utils";
import { Config } from "$/domain/entities/Config";
import { Stats } from "$/domain/entities/Stats";
import { getErrorFromResponse } from "$/data/utils";
import { D2ApiSharing } from "$/data/D2ApiSharing";

export class ProjectD2Repository implements ProjectRepository {
    private d2DataSetApi: DataSetD2Api;
    private d2ApiConfig: D2ApiConfig;
    private d2ApiSharing: D2ApiSharing;

    constructor(private api: D2Api, private config: Config) {
        this.d2DataSetApi = new DataSetD2Api(this.api, this.config);
        this.d2ApiConfig = new D2ApiConfig(this.api);
        this.d2ApiSharing = new D2ApiSharing();
    }

    getById(id: Id): FutureData<Project> {
        return apiToFuture(
            this.api.models.categoryOptions.get({
                fields: {
                    id: true,
                    code: true,
                    displayName: true,
                    lastUpdated: true,
                    organisationUnits: { id: true, code: true, path: true, displayName: true },
                    sharing: true,
                },
                filter: { id: { eq: id } },
                paging: false,
            })
        ).flatMap(response => {
            const d2CategoryOption = response.objects[0];
            if (!d2CategoryOption)
                return Future.error(new Error(`Project with id ${id} not found`));
            return Future.success(this.buildProject(d2CategoryOption));
        });
    }

    getList(options: GetListOptions): FutureData<Project[]> {
        return this.getCategories().flatMap(categories => {
            if (!categories.project.code) {
                console.warn("Project category code not found in metadata", categories.project);
                return Future.success([]);
            }

            return this.getCategoryOptionsByCode(categories.project.code, options).map(
                categoryOptions => {
                    return this.getProjectsWithDates(categoryOptions);
                }
            );
        });
    }

    getAll(): FutureData<Project[]> {
        return this.getAllProjects(1, []);
    }

    save(project: Project): FutureData<Stats> {
        return apiToFuture(
            this.api.models.categoryOptions.get({
                fields: { $owner: true },
                filter: { id: { eq: project.id } },
                paging: false,
            })
        ).flatMap(response => {
            const d2CategoryOption = response.objects[0];
            return apiToFuture(
                this.api.metadata.post({
                    categoryOptions: [
                        {
                            ...(d2CategoryOption || {}),
                            organisationUnits: project.orgsUnits.map(orgUnit => ({
                                id: orgUnit.id,
                            })),
                        },
                    ],
                })
            ).map(d2Response => {
                const errorMessage = getErrorFromResponse(d2Response);
                return Stats.create({
                    errorMessage,
                    ...d2Response.stats,
                });
            });
        });
    }

    private getCategoryOptionsByCode(code: string, options: GetListOptions) {
        return apiToFuture(
            this.api.models.categoryOptions.get({
                fields: {
                    code: true,
                    id: true,
                    displayName: true,
                    startDate: true,
                    endDate: true,
                    lastUpdated: true,
                    organisationUnits: { id: true, code: true, displayName: true, path: true },
                    sharing: true,
                },
                filter: { "categories.code": { eq: code }, ...this.buildDateFilter(options) },
                order: "displayName:asc",
                paging: false,
            })
        ).map(response => response.objects);
    }

    private buildDateFilter(options: GetListOptions) {
        const currentDate = new Date().toISOString();
        return {
            startDate: {
                le: options.includeClosedProjects ? undefined : currentDate,
            },
            endDate: {
                ge: options.includeClosedProjects ? undefined : currentDate,
            },
        };
    }

    private getProjectsWithDates(categoryOptions: D2CategoryOptionWithDates[]): Project[] {
        return categoryOptions.map(d2CategoryOption => {
            const { access } = this.d2ApiSharing.mapSharingToEntity(d2CategoryOption.sharing);
            return Project.build({
                dataSets: [],
                code: d2CategoryOption.code,
                id: d2CategoryOption.id,
                name: d2CategoryOption.displayName,
                lastUpdated: d2CategoryOption.lastUpdated,
                isOpen: this.isProjectOpen(d2CategoryOption.startDate, d2CategoryOption.endDate),
                orgsUnits: d2CategoryOption.organisationUnits.map(orgUnit => ({
                    id: orgUnit.id,
                    code: orgUnit.code,
                    name: orgUnit.displayName,
                    path: orgUnit.path.split("/").slice(1),
                })),
                access,
            });
        });
    }

    private isProjectOpen(date1: Maybe<ISODateString>, date2: Maybe<ISODateString>): boolean {
        if (!date1 || !date2) return false;

        const today = new Date();
        const startDate = new Date(date1);
        const endDate = new Date(date2);

        return today >= startDate && today <= endDate;
    }

    private getCategories(): FutureData<D2Config["categories"]> {
        return this.d2ApiConfig.get().map(({ categories }) => categories);
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
            filters: { includeDataSets: false },
            sorting: { field: "lastUpdated", order: "asc" },
        });
    }

    get(options: GetDataSetOptions): FutureData<Paginated<Project>> {
        return this.getCategories().flatMap(categories => {
            return apiToFuture(
                this.api.models.categoryOptions.get({
                    filter: {
                        "categories.code": { eq: categories.project.code },
                        identifiable: { token: options.filters.search },
                    },
                    page: options.paging.page,
                    pageSize: options.paging.pageSize,
                    fields: {
                        id: true,
                        code: true,
                        displayName: true,
                        lastUpdated: true,
                        organisationUnits: { id: true, code: true, path: true, displayName: true },
                        sharing: true,
                    },
                    order: this.buildOrderParam(options),
                })
            ).flatMap(d2Response => {
                const projects = d2Response.objects.map(d2Category => {
                    return this.buildProject(d2Category);
                });

                const projectsIds = projects.map(project => project.id);
                return this.getDataSets(projectsIds, options).map(dataSets => {
                    return {
                        page: d2Response.pager.page,
                        pageCount: d2Response.pager.pageCount,
                        total: d2Response.pager.total,
                        pageSize: d2Response.pager.pageSize,
                        data: this.buildProjectsWithDataSets(projects, dataSets),
                    };
                });
            });
        });
    }

    private buildProjectsWithDataSets(projects: Project[], dataSets: DataSet[]): Project[] {
        if (dataSets.length === 0) return projects;
        return projects.map(project => {
            const dataSetsForProject = dataSets.filter(
                dataSet => dataSet.project?.id === project.id
            );
            if (!dataSetsForProject) return project;
            return Project.setDataSets(project, dataSetsForProject);
        });
    }

    private getDataSets(projectsIds: Id[], options: GetDataSetOptions): FutureData<DataSet[]> {
        if (!options.filters.includeDataSets) return Future.success([]);
        return this.d2DataSetApi
            .getWithOrgUnits({
                paging: { page: 1, pageSize: 1e6 },
                sorting: { field: "lastUpdated", order: "desc" },
                filters: { search: "", projectsIds: projectsIds },
            })
            .map(response => {
                return response.data;
            });
    }

    private buildProject(
        d2CategoryOption: D2CategoryOptionType & { organisationUnits: D2OrgUnit[] }
    ): Project {
        const { access } = this.d2ApiSharing.mapSharingToEntity(d2CategoryOption.sharing);
        return Project.build({
            access: access,
            code: d2CategoryOption.code,
            id: d2CategoryOption.id,
            name: d2CategoryOption.displayName,
            lastUpdated: d2CategoryOption.lastUpdated,
            dataSets: [],
            isOpen: false,
            orgsUnits: d2CategoryOption.organisationUnits.map(orgUnit => ({
                code: orgUnit.code,
                id: orgUnit.id,
                name: orgUnit.displayName,
                path: orgUnit.path.split("/").slice(1),
            })),
        });
    }

    private buildOrderParam(options: GetDataSetOptions): string {
        if (!options.sorting.field) return "lastUpdated:desc";
        return `${options.sorting.field}:${options.sorting.order}`;
    }
}

type D2OrgUnit = { id: Id; code: string; displayName: string; path: string };
