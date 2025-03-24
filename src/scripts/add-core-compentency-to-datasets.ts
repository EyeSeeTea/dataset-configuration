import _ from "$/domain/entities/generic/Collection";
import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { getWebappCompositionRoot } from "$/CompositionRoot";
import { ConfigD2Repository } from "$/data/repositories/ConfigD2Repository";
import { writeFileSync } from "fs";
import { DataSet } from "$/domain/entities/DataSet";
import { escapeCSVField } from "$/scripts/utils";
import { Indicator } from "$/domain/entities/Indicator";

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
                        generateCsv(result);
                    },
                    error => {
                        console.error("Error", error);
                        process.exit(1);
                    }
                );
        },
    });

    run(cmd, process.argv.slice(2));
}

export const generateCsv = (dataSets: DataSet[]) => {
    const header = "id,name,project";

    const allRows = dataSets.map(dataSet => {
        const dsRow = `${escapeCSVField(dataSet.id)},${escapeCSVField(
            dataSet.name
        )},${escapeCSVField(dataSet.project?.name ?? "")}`;

        const indicatorHeader = ",core_competency_name,core_competency_code,indicator,type";

        const indicatorRowsUnsorted = _(dataSet.indicators)
            .groupBy(ind => `${ind.coreCompetency.id}_${ind.type}`)
            .values()
            .flat();

        const allIndicatorRowsUnsorted = indicatorRowsUnsorted.flatMap(indicator =>
            generateIndicatorsRows(indicator)
        );

        const sortedIndicatorRows = _(allIndicatorRowsUnsorted)
            .orderBy([
                [
                    row => {
                        const parts = row.coreCompetencyName.split(" ");
                        parts.pop();
                        return parts.join(" ").toLowerCase();
                    },
                    "asc",
                ],
                [
                    row => {
                        const typeToken =
                            row.coreCompetencyName.split(" ").pop()?.toLowerCase() || "";
                        return typeToken.startsWith("output")
                            ? 0
                            : typeToken.startsWith("outcome")
                            ? 1
                            : 2;
                    },
                    "asc",
                ],
            ])
            .value();

        const indicatorRows = sortedIndicatorRows.map(
            row =>
                `,${escapeCSVField(row.coreCompetencyName)},${escapeCSVField(
                    row.coreCompetencyCode
                )},${escapeCSVField(row.indicator)},${escapeCSVField(row.type)}`
        );

        return [dsRow, "", indicatorHeader, ...indicatorRows, ""].join("\n");
    });

    const csvContent = [header, ...allRows].join("\n");
    const currentTime = new Date().toISOString().replace(/:/g, "-");
    const csvFileName = `dataSets_${currentTime}.csv`;
    writeFileSync(csvFileName, csvContent);
    console.debug(`Finished. CSV file generated: ${csvFileName}`);
};

function generateIndicatorsRows(indicator: Indicator) {
    const baseCoreCompetencyName = `${indicator.coreCompetency.name} ${indicator.type}`;
    const baseCoreCompetencyCode = `${indicator.coreCompetency.id}_${indicator.type}_${indicator.coreCompetency.code}`;
    switch (indicator.type) {
        case "outputs": {
            return [
                {
                    coreCompetencyName: baseCoreCompetencyName,
                    coreCompetencyCode: baseCoreCompetencyCode,
                    indicator: escapeCSVField(indicator.name),
                    type: "dataElement",
                },
            ];
        }
        case "outcomes": {
            const mainRow = {
                coreCompetencyName: baseCoreCompetencyName,
                coreCompetencyCode: baseCoreCompetencyCode,
                indicator: escapeCSVField(indicator.name),
                type: "indicator",
            };
            const additionalRows = indicator.relatedDataElements.map(rde => ({
                coreCompetencyName: baseCoreCompetencyName,
                coreCompetencyCode: baseCoreCompetencyCode,
                indicator: escapeCSVField(rde.name),
                type: "dataElement-from-indicator",
            }));
            return [mainRow, ...additionalRows];
        }
    }
}

function parseDataSetIds(dataSetsIds: string): string[] {
    return dataSetsIds.split(",").map(id => id.trim());
}

main();
