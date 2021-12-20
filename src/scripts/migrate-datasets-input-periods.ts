import moment from "moment";
import _ from "lodash";
import fs from "fs";
import { ArgumentParser } from "argparse";
import { D2Api, MetadataPick } from "../types/d2-api";

/* 2021/12/20: This scripts migrates data sets with output/outcome dates, but no attribute
   for period dates. Steps:

   - For each data set:
    - Get data input periods opening/closing dates.
    - Get output/outcome dates (from attributes).
    - Set new opening/closing dates from min/max of these periods.
    - Set new period dates attributes from min/max of opening/closing dates.

   NOTE: Run this script within a dhis2 typescript project (copy to src/scripts):

   $ npx ts-node src/scripts/nrc-migrate-datasets-input-periods.ts \
        -u 'EyeSeeTea:PASSWORD' --url="https://gorsdev.nrc.no" --name-pattern=""
*/

type DateObj = { year: number; month: number; day: number };

const metadata = {
    attributes: {
        createdByApp: "wA748YSs3Qk",
        dataInputDates: "YyqT5dfIwL7",
        outcomeDates: "mrpeo3N3qcy",
        outputDates: "fhTYUbHAWiX",
    },
};

interface Args {
    auth: string;
    dhis2Url: string;
    namePattern: string;
}

function getArgs() {
    const parser = new ArgumentParser({
        description: "Migrate NRC data sets input periods",
    });

    parser.add_argument("-u", "--user-auth", {
        required: true,
        metavar: "USERNAME:PASS",
        dest: "auth",
    });

    parser.add_argument("--url", {
        required: true,
        help: "DHIS2 Base URL",
        metavar: "URL",
        dest: "dhis2Url",
    });

    parser.add_argument("--name-pattern", {
        required: true,
        help: "Datasets name pattern",
        metavar: "STRING",
        dest: "namePattern",
    });

    return parser.parse_args() as Args;
}

async function getDataSets(api: D2Api, options: { namePattern: string }): Promise<D2DataSet[]> {
    const { dataSets } = await api.metadata
        .get({
            dataSets: {
                fields: { $owner: true, attributeValues: { attribute: { id: true }, value: true } },
                filter: { name: { like: options.namePattern } },
            },
        })
        .getData();

    return dataSets;
}

function getApi(args: Args) {
    const [username = "", password = ""] = args.auth.split(":", 2);
    const api = new D2Api({ baseUrl: args.dhis2Url, auth: { username, password } });
    return api;
}

function writeJson(path: string, obj: unknown): void {
    const json = JSON.stringify(obj, null, 4);
    fs.writeFileSync(path, json);
    console.debug(`Written: ${path}`);
}

function getAttributeValue<Obj extends { attributeValues: D2DataSet["attributeValues"] }>(
    obj: Obj,
    attributeId: string
): string | undefined {
    const attributeValue = obj.attributeValues.find(av => av.attribute.id === attributeId);
    return attributeValue ? attributeValue.value : undefined;
}

const request = {
    dataSets: {
        fields: { $owner: true },
    },
};

interface D2AttributeValue {
    attribute: { id: string };
    value: string;
}

type D2DataSetBase = MetadataPick<typeof request>["dataSets"][number];

interface D2DataSet extends Omit<D2DataSetBase, "attributeValues"> {
    attributeValues: D2AttributeValue[];
}

function addOneMonth(date: DateObj): DateObj {
    return date.month === 12
        ? { ...date, year: date.year + 1, month: 1 }
        : { ...date, month: date.month + 1 };
}

function setAttribute(
    attributeValues: D2AttributeValue[],
    attributeId: string,
    value: string
): D2AttributeValue[] {
    const attributeFound = _(attributeValues).some(av => av.attribute.id === attributeId);

    return attributeFound
        ? attributeValues.map(av => (av.attribute.id === attributeId ? { ...av, value } : av))
        : attributeValues.concat([{ attribute: { id: attributeId }, value }]);
}

function getDates(datesListStr: string | undefined): Array<{ start: DateObj; end: DateObj }> {
    const parts = (datesListStr || "").split(",");

    return _(parts)
        .map(part => {
            const interval = part.split("=")[1];
            const [startS, endS] = (interval || "").split("-");
            const start = getDateObjFromString(startS);
            const end = getDateObjFromString(endS);
            return start && end ? { start, end } : undefined;
        })
        .compact()
        .value();
}

function getDateObjFromString(
    dateStr: string | undefined,
    defaults: { month: number; day: number } = { month: 1, day: 1 }
): DateObj | undefined {
    if (!dateStr) return;

    const [s1, s2, s3] = [dateStr.slice(0, 4), dateStr.slice(4, 6), dateStr.slice(6, 8)];
    const year = parseInt(s1);
    const month = s2 ? parseInt(s2) : defaults.month;
    const day = s3 ? parseInt(s3) : defaults.day;
    return year && month && day ? { year, month, day } : undefined;
}

function dateToIso(date: DateObj): string {
    const dateParts = [padDigits(date.year, 4), padDigits(date.month, 2), padDigits(date.day, 2)];
    return dateParts.join("-") + "T00:00:00.000";
}

function dateToString(date: DateObj): string {
    const dateParts = [padDigits(date.year, 4), padDigits(date.month, 2), padDigits(date.day, 2)];
    return dateParts.join("");
}

function padDigits(number: number, digits: number): string {
    return Array(Math.max(digits - String(number).length + 1, 0)).join("0") + number;
}

function processDataSets(dataSets: D2DataSet[]): [D2DataSet[], D2DataSet[]] {
    const data = _(dataSets)
        .filter(dataSet => getAttributeValue(dataSet, metadata.attributes.createdByApp) === "true")
        .map(dataSet => {
            const dataSetUpdated = updateDataSet(dataSet);
            return _.isEqual(dataSetUpdated, dataSet)
                ? undefined
                : { original: dataSet, updated: dataSetUpdated };
        })
        .compact()
        .value();

    const dataSetsOriginal = data.map(d => d.original);
    const dataSetsUpdated = data.map(d => d.updated);

    return [dataSetsOriginal, dataSetsUpdated];
}

function getDateFromISO(s: string | undefined): DateObj | undefined {
    if (!s) return;
    const m0 = moment.utc(s);
    // Tipically hours > 12 indicate a time-offset due to time-zone, then increment 1 day.
    const m =
        m0.hour() > 12
            ? m0
                  .clone()
                  .add(1, "day")
                  .startOf("day")
            : m0.clone().startOf("day");
    return { year: m.year(), month: m.month() + 1, day: m.date() };
}

function updateDataSet(dataSet: D2DataSet): D2DataSet {
    const { attributes } = metadata;

    const periodDates = getAttributeValue(dataSet, attributes.dataInputDates);
    const outputDatesS = getAttributeValue(dataSet, attributes.outputDates);
    const outcomeDatesS = getAttributeValue(dataSet, attributes.outcomeDates);
    const outputDates = getDates(outputDatesS);
    const outcomeDates = getDates(outcomeDatesS);

    const minFromDipsOpening = getDateFromISO(
        _(dataSet.dataInputPeriods)
            .map(dip => dip.openingDate)
            .compact()
            .min()
    );

    const maxFromDipsClosing = getDateFromISO(
        _(dataSet.dataInputPeriods)
            .map(dip => dip.closingDate)
            .compact()
            .max()
    );

    const periods = dataSet.dataInputPeriods.map(dip => dip.period.id as string);
    const _minFromDips = getDateObjFromString(_.min(periods));
    const maxFromDips0 = getDateObjFromString(_.max(periods));
    const _maxFromDips = maxFromDips0 ? addOneMonth(maxFromDips0) : maxFromDips0;

    const minStartDate = _(outputDates.map(date => date.start))
        .concat(outcomeDates.map(date => date.start))
        //.concat(minFromDips ? [minFromDips] : [])
        .minBy(dateToIso);

    const maxEndDate = _(outputDates.map(date => date.end))
        .concat(outcomeDates.map(date => date.end))
        //.concat(maxFromDips ? [maxFromDips] : [])
        .maxBy(dateToIso);

    const dataSetS = `${dataSet.name} [${dataSet.id}]`;

    if (periodDates) {
        console.debug(`${dataSetS}: already has period dates`);
        return dataSet;
    } else if (!outputDatesS && !outcomeDatesS) {
        console.debug(`${dataSetS}: no output/outcome info`);
        return dataSet;
    } else if (!minStartDate) {
        console.debug(`${dataSetS}: no start dates`);
        return dataSet;
    } else if (!maxEndDate) {
        console.debug(`${dataSetS}: no end dates`);
        return dataSet;
    } else if (!minFromDipsOpening || !maxFromDipsClosing) {
        console.debug(`${dataSetS}: no dataInputPeriods data`);
        return dataSet;
    } else {
        const dataInputPeriodsUpdated = dataSet.dataInputPeriods.map(dip => ({
            ...dip,
            openingDate: dateToIso(minStartDate),
            closingDate: dateToIso(maxEndDate),
        }));

        const dipsUpdated = [
            dateToString(minFromDipsOpening),
            dateToString(maxFromDipsClosing),
        ].join("-");

        return {
            ...dataSet,
            attributeValues: setAttribute(
                dataSet.attributeValues,
                attributes.dataInputDates,
                dipsUpdated
            ),
            dataInputPeriods: dataInputPeriodsUpdated,
        };
    }
}

/* Main */

async function runMigration() {
    const args = getArgs();
    const api = getApi(args);
    const dataSets = await getDataSets(api, args);
    console.debug(`Data sets with pattern '${args.namePattern}': ${dataSets.length}`);

    const [dataSetsOriginal, dataSetsUpdated] = processDataSets(dataSets);

    console.debug(`Data sets with changes: ${dataSetsUpdated.length}`);
    writeJson("datasets-original.json", { dataSets: dataSetsOriginal });

    _.chunk(dataSetsUpdated, 500).forEach((dataSetsGroup, idx) => {
        writeJson(`datasets-updated-${idx + 1}.json`, { dataSets: dataSetsGroup });
    });
}

runMigration();
