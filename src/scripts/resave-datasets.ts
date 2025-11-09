import { command, run, string, option, optional } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { ConfigD2Repository } from "$/data/repositories/ConfigD2Repository";
import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Resave all datasets",
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
            dataSetIds: option({
                type: optional(string),
                long: "dataset-ids",
                short: "d",
                description:
                    "Comma-separated list of dataset IDs. If not provided, all datasets will be processed",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });

            console.debug("Loading configuration and dataset repository");
            const configRepository = new ConfigD2Repository(api);
            const config = await configRepository.get().toPromise();
            const dataSetRepository = new DataSetD2Repository(api, config);

            const ids = args.dataSetIds
                ? args.dataSetIds.split(",").map(id => id.trim())
                : undefined;

            console.debug(`Fetching ${ids ? ids.length : "all"} dataset/s...`);

            const dataSets = ids ? await dataSetRepository.getByIds(ids).toPromise() : await []; //dataSetRepository.getAll().toPromise();

            console.debug(`Found ${dataSets.length} dataset/s`);

            if (dataSets.length === 0) {
                console.debug("No datasets to process");
                return;
            }

            console.debug(`Saving ${dataSets.length} dataset/s...`);
            await dataSetRepository.save(dataSets).toPromise();
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
