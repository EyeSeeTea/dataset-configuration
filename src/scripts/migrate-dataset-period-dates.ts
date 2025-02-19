import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { getWebappCompositionRoot } from "$/CompositionRoot";
import { ConfigD2Repository } from "$/data/repositories/ConfigD2Repository";

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
            const configRepository = new ConfigD2Repository(api);
            const config = await configRepository.get().toPromise();
            const compositionRoot = getWebappCompositionRoot(api, config);
            compositionRoot.dataSets.migratePeriodDates.execute().run(
                response => {
                    console.debug(JSON.stringify(response, null, 4));
                },
                error => {
                    console.error(error);
                }
            );
        },
    });

    run(cmd, process.argv.slice(2));
}

main();
