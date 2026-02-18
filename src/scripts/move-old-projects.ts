import _ from "lodash";
import path from "path";
import { writeFileSync } from "fs";
import { command, run, string, option, flag } from "cmd-ts";
import { D2Api } from "@eyeseetea/d2-api/2.42";

type Id = string;

type ScriptArgs = Readonly<{
    url: string;
    username: string;
    password: string;
    persist: boolean;
}>;

type Category = Readonly<{ id: Id; categoryOptions?: Array<{ id: Id }> }>;

const DEFAULTS = {
    sqlViewId: "XKCUtfKjjOt",
    fromCategoryId: "MRwzyV0kXv9",
    toCategoryId: "WIWj6TauYO8",
} as const;

const main = () => {
    const cmd = command({
        name: path.basename(__filename),
        description: "Move category options from one category to another using SQL View result",
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
            persist: flag({
                long: "persist",
                short: "a",
                description: "Persist changes",
            }),
        },
        handler: async args => runMigration(args),
    });

    run(cmd, process.argv.slice(2));
};

const runMigration = async (args: ScriptArgs): Promise<void> => {
    const api = new D2Api({
        baseUrl: args.url,
        auth: { username: args.username, password: args.password },
        backend: "xhr",
    });

    const projects = await getOldProjectsWithDeprecatedData(api, DEFAULTS.sqlViewId);
    const oldProjectIdsInSqlView = projects.map(project => project.id);

    if (oldProjectIdsInSqlView.length === 0) {
        console.debug("No old projects found in SQL View, finished without changes");
        return;
    }

    const fromCategory = await getCategoryById(api, DEFAULTS.fromCategoryId);
    const toCategory = await getCategoryById(api, DEFAULTS.toCategoryId);

    const fromCategoryOptionIds = getCategoryOptionIds(fromCategory);
    const toCategoryOptionIds = getCategoryOptionIds(toCategory);

    const idsToMove = _(oldProjectIdsInSqlView).intersection(fromCategoryOptionIds).uniq().value();
    const idsAlreadyInTarget = _(idsToMove).intersection(toCategoryOptionIds).uniq().value();
    const idsNewInTarget = _(idsToMove).difference(toCategoryOptionIds).uniq().value();

    const updatedFromCategory = buildUpdatedCategoryWithoutIds(fromCategory, idsToMove);
    const updatedToCategory = buildUpdatedCategoryWithIds(toCategory, idsToMove);
    const metadataToPost = {
        categories: [updatedFromCategory, updatedToCategory],
    };
    const metadataFileName = buildMetadataFileName();

    writeFileSync(metadataFileName, JSON.stringify(metadataToPost, null, 4));

    logSummary({
        fromCategoryId: DEFAULTS.fromCategoryId,
        toCategoryId: DEFAULTS.toCategoryId,
        sourceCategoryOptionsBefore: fromCategoryOptionIds.length,
        targetCategoryOptionsBefore: toCategoryOptionIds.length,
        idsToMove: idsToMove.length,
        idsAlreadyInTarget: idsAlreadyInTarget.length,
        idsNewInTarget: idsNewInTarget.length,
        sourceCategoryOptionsAfter: getCategoryOptionIds(updatedFromCategory).length,
        targetCategoryOptionsAfter: getCategoryOptionIds(updatedToCategory).length,
        metadataFileName,
    });

    const result =
        idsToMove.length > 0
            ? await api.metadata
                  .post(metadataToPost, { importMode: args.persist ? "COMMIT" : "VALIDATE" })
                  .getData()
            : undefined;

    const metadataStats = result?.stats;

    const metadataSummary = metadataStats
        ? `created=${metadataStats.created}, updated=${metadataStats.updated}, deleted=${metadataStats.deleted}, ignored=${metadataStats.ignored}`
        : "no metadata import executed";

    console.debug(`Metadata result: ${metadataSummary}`);
};

const getOldProjectsWithDeprecatedData = async (
    api: D2Api,
    sqlViewId: Id
): Promise<{ id: string; name: string }[]> => {
    const response = await api.sqlViews.query(sqlViewId, { paging: false }).getData();

    return response.rows.map(row => {
        const getValue = (key: string) => row[key] || "";

        return { id: getValue("id"), name: getValue("name") };
    });
};

const getCategoryById = async (api: D2Api, categoryId: Id): Promise<Category> => {
    const response = await api.models.categories
        .get({ fields: { $owner: true }, filter: { id: { eq: categoryId } } })
        .getData();

    const category = response.objects[0];

    if (!category) {
        throw new Error(`Category with id ${categoryId} not found`);
    }

    return category;
};

const getCategoryOptionIds = (category: Category): Array<Id> => {
    return _(category.categoryOptions ?? [])
        .map(categoryOption => categoryOption.id)
        .uniq()
        .value();
};

const buildUpdatedCategoryWithoutIds = (category: Category, idsToRemove: Array<Id>): Category => {
    const currentIds = getCategoryOptionIds(category);
    const nextIds = _(currentIds)
        .filter(id => !idsToRemove.includes(id))
        .uniq()
        .value();

    return {
        ...category,
        categoryOptions: nextIds.map(id => ({ id })),
    };
};

const buildUpdatedCategoryWithIds = (category: Category, idsToAdd: Array<Id>): Category => {
    const currentIds = getCategoryOptionIds(category);
    const nextIds = _(currentIds).concat(idsToAdd).uniq().value();

    return { ...category, categoryOptions: nextIds.map(id => ({ id })) };
};

const buildMetadataFileName = (): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `metadata_categories_${timestamp}.json`;
};

const logSummary = (params: {
    fromCategoryId: Id;
    toCategoryId: Id;
    sourceCategoryOptionsBefore: number;
    targetCategoryOptionsBefore: number;
    idsToMove: number;
    idsAlreadyInTarget: number;
    idsNewInTarget: number;
    sourceCategoryOptionsAfter: number;
    targetCategoryOptionsAfter: number;
    metadataFileName: string;
}): void => {
    console.debug("--------------------------------------------");
    console.debug(`Move from category: ${params.fromCategoryId}`);
    console.debug(`Move to category: ${params.toCategoryId}`);
    console.debug(`Source category options before: ${params.sourceCategoryOptionsBefore}`);
    console.debug(`Target category options before: ${params.targetCategoryOptionsBefore}`);
    console.debug(`Category options to move: ${params.idsToMove}`);
    console.debug(`Already in target: ${params.idsAlreadyInTarget}`);
    console.debug(`New in target: ${params.idsNewInTarget}`);
    console.debug(`Source category options after: ${params.sourceCategoryOptionsAfter}`);
    console.debug(`Target category options after: ${params.targetCategoryOptionsAfter}`);
    console.debug(`Metadata file: ${params.metadataFileName}`);
    console.debug("--------------------------------------------");
};

main();
