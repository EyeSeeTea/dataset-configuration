import { command, run, string, option, optional, flag } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { ConfigD2Repository } from "$/data/repositories/ConfigD2Repository";
import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Resave data sets so their custom forms are regenerated",
        args: {
            url: option({
                type: string,
                long: "dhis2-url",
                short: "u",
                description: "DHIS2 base URL. Example: http://localhost:8080",
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
                type: optional(string),
                long: "data-set-ids",
                short: "d",
                description: "Comma separated list of dataSets ids",
            }),
            all: flag({
                long: "all",
                description:
                    "Resave every data set in the instance. Required when --data-set-ids is not given",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });
            const dataSetIds = parseDataSetIds(args.dataSetIds);
            const hasDataSetIds = dataSetIds.length > 0;

            // Reason: resaving every data set must be asked for, never the result of an empty argument
            if (args.all && args.dataSetIds !== undefined) {
                console.error("Pass either --all or --data-set-ids, not both");
                process.exit(1);
            } else if (!args.all && !hasDataSetIds) {
                console.error(
                    args.dataSetIds === undefined
                        ? "Pass --data-set-ids <ids>, or --all to resave every data set"
                        : "--data-set-ids contained no valid ids"
                );
                process.exit(1);
            }

            console.debug("Loading configuration...");
            const configRepository = new ConfigD2Repository(api);
            const config = await configRepository.get().toPromise();
            const dataSetRepository = new DataSetD2Repository(api, config);

            console.debug(
                hasDataSetIds
                    ? `Fetching ${dataSetIds.length} data set/s...`
                    : "Fetching all data sets..."
            );
            const dataSets = hasDataSetIds
                ? await dataSetRepository.getByIds(dataSetIds).toPromise()
                : await dataSetRepository.getAll().toPromise();

            if (dataSets.length === 0) {
                console.debug("No data sets to resave");
                return;
            }

            console.debug(`Resaving ${dataSets.length} data set/s...`);
            await dataSetRepository.save(dataSets).toPromise();
            console.debug("Done");
        },
    });

    run(cmd, process.argv.slice(2)).catch(error => {
        console.error(error);
        process.exit(1);
    });
}

function parseDataSetIds(dataSetIds: string | undefined): string[] {
    return (dataSetIds ?? "")
        .split(",")
        .map(id => id.trim())
        .filter(id => id !== "");
}

main();
