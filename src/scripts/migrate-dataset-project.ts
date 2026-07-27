import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { writeFileSync } from "fs";
import { escapeCSVField } from "$/scripts/csv";
import { NamedRef } from "$/domain/entities/Ref";
import { chunkRequest } from "$/data/utils";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { apiToFuture } from "$/data/api-futures";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            url: option({
                type: string,
                long: "dhis2-url",
                short: "u",
                description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
            }),
            username: option({
                type: string,
                long: "username",
                short: "user",
            }),
            password: option({
                type: string,
                long: "password",
                short: "pwd",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });

            const attributeProject = await api.models.attributes
                .get({
                    fields: { id: true },
                    filter: { code: { eq: "GL_DATASET_PROJECT" } },
                    paging: false,
                })
                .getData();

            const categoryCode = await api.models.categories
                .get({
                    fields: { id: true },
                    filter: { code: { eq: "GL_Project" } },
                    paging: false,
                })
                .getData();

            if (!categoryCode.objects[0]) throw new Error("Category GL_Project not found");

            const attributeProjectId = attributeProject.objects[0]?.id;
            if (!attributeProjectId) throw new Error("Attribute GL_DATASET_PROJECT not found");

            const projects = await getAllProjects({
                api,
                page: 1,
                records: [],
            });
            const dataSets = await getAllDataSets({
                api,
                page: 1,
                records: [],
            });

            const allDataSetsProjects = assignProjectsToDataSets(dataSets, projects);

            const dataSetsWithProjects = allDataSetsProjects.filter(ds => ds.project);
            const dataSetsWithoutProjects = allDataSetsProjects.filter(ds => !ds.project);
            console.debug("DataSets with projects", dataSetsWithProjects.length);
            console.debug("DataSets without projects", dataSetsWithoutProjects.length);
            console.debug(`Saving ${dataSetsWithProjects.length} dataSets...`);

            await saveDataSet({
                api,
                attributeProjectId: attributeProjectId,
                dataSets: dataSetsWithProjects,
            }).toPromise();

            const csvProjectsFileName = "ds_with_projects.csv";
            const csvNoProjectsFileName = "ds_without_projects.csv";
            writeFileSync(csvProjectsFileName, generateCSV(dataSetsWithProjects));
            writeFileSync(csvNoProjectsFileName, generateCSV(dataSetsWithoutProjects));
            console.debug(
                `CSV reports generated: ${csvProjectsFileName} and ${csvNoProjectsFileName}`
            );
        },
    });

    run(cmd, process.argv.slice(2));
}

function assignProjectsToDataSets(
    dataSets: DataSetProject[],
    projects: NamedRef[]
): DataSetProject[] {
    return dataSets.map(dataSet => {
        const project = projects.find(project => dataSet.name.includes(project.name));
        return { ...dataSet, project: project };
    });
}

function saveDataSet(options: {
    api: D2Api;
    dataSets: DataSetProject[];
    attributeProjectId: string;
}): FutureData<void> {
    const { attributeProjectId, api, dataSets } = options;

    const allDsIds = dataSets.map(ds => ds.id);

    const $requests = chunkRequest(allDsIds, dataSetIds => {
        return apiToFuture(
            api.models.dataSets.get({
                fields: { $owner: true },
                filter: { id: { in: dataSetIds } },
                paging: false,
            })
        ).flatMap(response => {
            const dataSetsToSave = dataSetIds.map(dataSetId => {
                const existingDataSet = response.objects.find(ds => ds.id === dataSetId);
                const dataSet = dataSets.find(dataSet => dataSet.id === dataSetId);
                if (!dataSet) {
                    throw Error(`Cannot find dataSet: ${dataSetId}`);
                }

                const projectAttribute = {
                    attribute: { id: attributeProjectId },
                    value: dataSet.project?.id,
                };

                const attributesToSave = [projectAttribute].filter(attr => attr.value);

                const filteredExisting =
                    existingDataSet?.attributeValues?.filter(
                        attr =>
                            !attributesToSave.some(save => save.attribute.id === attr.attribute.id)
                    ) || [];

                const attributeValues = [...filteredExisting, ...attributesToSave];

                return { ...(existingDataSet || {}), attributeValues: attributeValues };
            });

            return apiToFuture(
                api.metadata.post({ dataSets: dataSetsToSave }, { importMode: "COMMIT" })
            )
                .map(response => {
                    return [{ ...response.stats }];
                })
                .flatMapError(err => {
                    console.error("Error saving dataSets:", err);
                    return Future.success([]);
                });
        });
    });

    return $requests.map(stats => {
        const allStats = stats.reduce(
            (acc, curr) => {
                acc.created += curr.created;
                acc.updated += curr.updated;
                acc.deleted += curr.deleted;
                acc.ignored += curr.ignored;
                return acc;
            },
            { created: 0, updated: 0, deleted: 0, ignored: 0 }
        );

        console.debug("Finished");
        console.debug(JSON.stringify(allStats, null, 2));
    });
}

async function getAllDataSets(options: { api: D2Api; page: number; records: NamedRef[] }) {
    const { records, api, page } = options;

    const response = await getDataSets({ api, page, pageSize: 200 });
    const newProjects = [...records, ...response.data];
    if (response.pager.page >= response.pager.pageCount) {
        return newProjects;
    } else {
        return getAllDataSets({ api, page: page + 1, records: newProjects });
    }
}

async function getAllProjects(options: { api: D2Api; page: number; records: NamedRef[] }) {
    const { records, api, page } = options;

    const response = await getProjects({ api, page, pageSize: 200 });
    const newProjects = [...records, ...response.data];
    if (response.pager.page >= response.pager.pageCount) {
        return newProjects;
    } else {
        return getAllProjects({ api, page: page + 1, records: newProjects });
    }
}

async function getProjects(options: { api: D2Api; page: number; pageSize: number }) {
    const { api, page, pageSize } = options;
    const response = await api.models.categoryOptions
        .get({
            filter: { "categories.code": { eq: "GL_Project" } },
            page: page,
            pageSize: pageSize,
            fields: { id: true, code: true, displayName: true },
        })
        .getData();

    return {
        data: response.objects.map(item => ({ id: item.id, name: item.displayName })),
        pager: response.pager,
    };
}

async function getDataSets(options: { api: D2Api; page: number; pageSize: number }) {
    const { api, page, pageSize } = options;
    const response = await api.models.dataSets
        .get({ page: page, pageSize: pageSize, fields: { id: true, displayName: true } })
        .getData();

    return {
        data: response.objects.map(item => ({
            id: item.id,
            name: item.displayName,
            project: undefined,
        })),
        pager: response.pager,
    };
}

function generateCSV(data: DataSetProject[]): string {
    const headers = ["id", "name", "project"];
    const rows = data.map(dataset =>
        [
            dataset.id,
            escapeCSVField(dataset.name),
            escapeCSVField(dataset.project?.name || "") || "",
        ].join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    return csvContent;
}

type DataSetProject = {
    id: string;
    name: string;
    project?: NamedRef;
};

main();
