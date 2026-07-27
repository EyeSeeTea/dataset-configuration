import _ from "$/domain/entities/generic/Collection";
import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { Future } from "$/domain/entities/generic/Future";

/*
Usage:

npx tsx src/scripts/clone-datastore-namespace.ts \
    --dhis2-url='http://localhost:8080' \
    --username='admin' \
    --password='district' \
    --from-ns='dataset-configuration' \
    --to-ns='project-configuration'
*/

// Not implemented in clean arch. because time constraints and
// none of this have an impact on business/application logic.
function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "clone all data from one namespace to another",
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
            fromNs: option({
                type: string,
                long: "from-ns",
                short: "fns",
                description: "namespace to clone from",
            }),
            toNs: option({
                type: string,
                long: "to-ns",
                short: "tns",
                description: "namespace to clone to",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });

            let page = 1;
            const pageSize = 50;
            const namespaceFromData: DataStoreEntry[] = [];

            /* eslint-disable no-constant-condition */
            while (true) {
                console.debug(`Fetching page ${page} from namespace ${args.fromNs}`);
                const dataStoreFrom = await api
                    .request<{ pager: { page: number }; entries: DataStoreEntry[] }>({
                        method: "get",
                        url: `/dataStore/${args.fromNs}`,
                        params: { fields: ".", page: page, pageSize: pageSize },
                    })
                    .getData();

                if (dataStoreFrom.entries.length === 0) break;

                namespaceFromData.push(...dataStoreFrom.entries);
                page += 1;
            }

            const dataStoreTo = api.dataStore(args.toNs);

            const requests$ = namespaceFromData.map(dsEntry => {
                return apiToFuture(dataStoreTo.save(dsEntry.key, dsEntry.value));
            });

            await Future.parallel(requests$, { concurrency: 5 }).toPromise();
            console.debug("DataStore cloned");
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

type DataStoreEntry = {
    key: string;
    value: object;
};
