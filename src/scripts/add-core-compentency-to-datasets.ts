import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { getWebappCompositionRoot } from "$/CompositionRoot";
import { ConfigD2Repository } from "$/data/repositories/ConfigD2Repository";
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
                short: "s",
            }),
            password: option({
                type: string,
                long: "password",
                short: "p",
            }),
            dataSetIds: option({
                type: string,
                long: "data-set-ids",
                short: "d",
                description: "Comma separated list of dataSets ids",
            }),
            coreCompetencyCode: option({
                type: string,
                long: "core-competency-code",
                short: "c",
                description: "Core competency code",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });
            const dataSetIds = parseDataSetIds(args.dataSetIds);
            if (dataSetIds.length === 0) {
                console.error("Data sets ids are required");
                process.exit(1);
            }
            const configRepository = new ConfigD2Repository(api);
            console.debug("Loading configuration...");
            const config = await configRepository.get().toPromise();
            const compositionRoot = getWebappCompositionRoot(api, config);
            compositionRoot.dataSets.addCoreCompetency
                .execute({ dataSetIds, coreCompetencyCode: args.coreCompetencyCode })
                .run(
                    result => {
                        console.debug("Finished");
                        writeFileSync("dataSets.json", JSON.stringify(result, null, 2));
                        process.exit(0);
                    },
                    error => {
                        console.error(error.message);
                        process.exit(1);
                    }
                );
        },
    });

    run(cmd, process.argv.slice(2));
}

function parseDataSetIds(dataSetsIds: string): string[] {
    return dataSetsIds.split(",").map(id => id.trim());
}

main();
