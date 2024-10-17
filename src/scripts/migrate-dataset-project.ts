import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { getWebappCompositionRoot } from "$/CompositionRoot";
import { MetadataD2Repository } from "$/data/repositories/MetadataD2Repository";
import { DataSet } from "$/domain/entities/DataSet";
import { writeFileSync } from "fs";

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
            const metadata = await new MetadataD2Repository(api).get().toPromise();
            const compositionRoot = getWebappCompositionRoot(api, metadata);
            compositionRoot.dataSets.migrateProjects.execute().run(
                response => {
                    console.debug("DataSets saved");
                    const csvProjectsFileName = "ds_with_projects.csv";
                    const csvNoProjectsFileName = "ds_without_projects.csv";
                    writeFileSync(csvProjectsFileName, generateCSV(response.dataSetsWithProjects));
                    writeFileSync(
                        csvNoProjectsFileName,
                        generateCSV(response.dataSetsWithoutProjects)
                    );
                    console.debug(
                        `CSV reports generated: ${csvProjectsFileName} and ${csvNoProjectsFileName}`
                    );
                },
                error => {
                    console.error(error);
                }
            );
        },
    });

    run(cmd, process.argv.slice(2));
}

function generateCSV(data: DataSet[]): string {
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

function escapeCSVField(field: string): string {
    return field.includes(",") ? `"${field.replace(/"/g, '""')}"` : field;
}

main();
