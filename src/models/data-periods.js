import moment from "moment";
import { generateUid } from "d2/lib/uid";

import _ from "../utils/lodash-mixins";
import {
    setAttributes,
    postMetadata,
    getCategoryCombos,
    mapPromise,
    getOwnedPropertyJSON,
} from "../utils/Dhis2Helpers";
import Settings from "./Settings";
import DataSetStore from "./DataSetStore";

const dataInputPeriodDatesFormat = "YYYYMMDD";

export async function getDataSets(d2, ids) {
    return await d2.models.dataSets
        .list({
            fields: "id,displayName,attributeValues,dataInputPeriods[id,openingDate,closingDate,period]",
            filter: `id:in:[${ids.join(",")}]`,
            paging: false,
        })
        .then(collection => collection.toArray());
}

export function getAttributeValues(store, dataset) {
    const { config } = store;
    const attributeKeys = [
        "dataPeriodOutputDatesAttributeId",
        "dataPeriodOutcomeDatesAttributeId",
        "dataPeriodIntervalDatesAttributeId",
    ];
    const missingAttributeKeys = attributeKeys.filter(key => !config[key]);
    const oldAttributeValues = (dataset && dataset.attributeValues) || [];

    if (!_(missingAttributeKeys).isEmpty()) {
        console.error(`Missing settings: ${missingAttributeKeys.join(", ")}`);
        return oldAttributeValues;
    }

    const periodDates = store.getPeriodDates();
    const years = store.getPeriodYears();
    const dataInterval = [
        formatDate(store.associations.dataInputStartDate),
        formatDate(store.associations.dataInputEndDate),
    ].join("-");

    const valuesByKey = {
        dataPeriodOutputDatesAttributeId: formatPeriodDates(periodDates.output, years),
        dataPeriodOutcomeDatesAttributeId: formatPeriodDates(periodDates.outcome, years),
        dataPeriodIntervalDatesAttributeId: dataInterval,
    };
    const newValues = _.mapKeys(valuesByKey, (_value, key) => config[key]);

    return setAttributes(oldAttributeValues, newValues);
}

let categoryCombos = null;

async function getCachedCategoryCombos(d2) {
    categoryCombos =
        categoryCombos || (await getCategoryCombos(d2, { cocFields: "id,categoryOptions[id]" }));
    return categoryCombos;
}

export async function saveDataSets(d2, store, dataSets) {
    return saveDataSetsWithMapper(d2, store, dataSets, dataSet => ({
        ...getOwnedPropertyJSON(dataSet),
        attributeValues: getAttributeValues(store, dataSet),
        dataInputPeriods: store.getDataInputPeriods(store.associations),
        openFuturePeriods: store.dataset.openFuturePeriods,
    }));
}

export async function saveDataSetsEndDate(d2, store, dataSets, endYear) {
    const { config, associations } = store;
    const newPartialPeriodDates = associations.periodDates;

    return saveDataSetsWithMapper(d2, store, dataSets, dataSet => {
        const { periodDates } = DataSetStore.getPeriodAssociations(d2, config, dataSet);

        // Modify only periodDates for end date and endYear.
        const newPeriodDates = {
            output: _.mapValues(periodDates.output, (interval, year) =>
                parseInt(year) === endYear
                    ? { start: interval.start, end: newPartialPeriodDates.output[year].end }
                    : interval
            ),
            outcome: _.mapValues(periodDates.outcome, (interval, year) =>
                parseInt(year) === endYear
                    ? { start: interval.start, end: newPartialPeriodDates.outcome[year].end }
                    : interval
            ),
        };

        const newAssociations = { ...associations, periodDates: newPeriodDates };
        store.associations = newAssociations;

        const newDataset = {
            ...getOwnedPropertyJSON(dataSet),
            attributeValues: getAttributeValues(store, dataSet),
            dataInputPeriods: store.getDataInputPeriods(newAssociations),
        };

        return newDataset;
    });
}

export async function saveDataSetsWithMapper(d2, store, dataSets, mapper) {
    const dataSetsWithForms = await d2.models.dataSets
        .list({
            fields: ":owner,dataEntryForm[:owner]",
            filter: `id:in:[${dataSets.map(ds => ds.id).join(",")}]`,
            paging: false,
        })
        .then(collection => collection.toArray());

    const periodDates = store.getPeriodDates();
    categoryCombos = null;

    const pairs = await mapPromise(dataSetsWithForms, async dataSet => {
        const htmlCode = (dataSet.dataEntryForm && dataSet.dataEntryForm.htmlCode) || "";
        const regexp = /setPeriodDates\({.*}\)/;
        const newJsCode = `setPeriodDates(${JSON.stringify(periodDates)})`;

        const formPayload = htmlCode.match(regexp)
            ? { htmlCode: htmlCode.replace(regexp, newJsCode) }
            : await store.buildCustomForm(await getCachedCategoryCombos(d2));

        const id = (dataSet.dataEntryForm ? dataSet.dataEntryForm.id : null) || generateUid();
        const dataEntryFormUpdated = {
            ...dataSet.dataEntryForm,
            ...formPayload,
            id: id,
            name: [dataSet.id, id].join("-"),
        };
        dataSet.dataEntryForm = { id: dataEntryFormUpdated.id };

        return [dataSet, dataEntryFormUpdated];
    });
    const [dataSetsClean, dataEntryFormsUpdated] = _.unzip(pairs);

    const dataSetsUpdated = dataSetsClean.map(dataSet => mapper(dataSet));

    const payload = {
        create_and_update: {
            dataSets: dataSetsUpdated,
            dataEntryForms: _.compact(dataEntryFormsUpdated),
        },
    };

    return postMetadata(d2, payload);
}

function areDatesUniq(dates) {
    const uniqValues = _.uniq(dates.map(date => date ? date.toISOString() : null))
    return uniqValues.length === 1 && uniqValues[0];
}

export async function getDataSetsForPeriodsEndDate(d2, dataSetIds, endYear) {
    const dataSets = await getDataSets(d2, dataSetIds);
    const config = await new Settings(d2).get();
    const store = await DataSetStore.edit(d2, config, dataSetIds[0]);
    const t = d2.i18n.getTranslation.bind(d2.i18n);

    const [startDates, endDates] = _(dataSets)
        .map(dataset => getDataInputDates(dataset, config))
        .map(o => [o.dataInputStartDate, o.dataInputEndDate])
        .unzip()
        .value();

    const allDataSetsContainYear =
        _.every(startDates, startDate => startDate && startDate.getFullYear() <= endYear) &&
        _.every(endDates, endDate => endDate && endDate.getFullYear() >= endYear);

    if (!allDataSetsContainYear)
        return { error: t("not_all_datasets_contain_year", { year: endYear }) };

    const dataSetsData = dataSets.map(dataSet =>
        DataSetStore.getPeriodAssociations(d2, config, dataSet)
    );

    const outputEnds = dataSetsData.map(data => data.periodDates.output[endYear].end);
    const outputEnd = areDatesUniq(outputEnds) ? outputEnds[0] : null;

    const outcomeEnds = dataSetsData.map(data => data.periodDates.outcome[endYear].end);
    const outcomeEnd = areDatesUniq(outcomeEnds) ? outcomeEnds[0] : null;

    // If all datasets have the same date, pre-fill it; otherwise, show empty field.
    _.assign(store.associations, {
        periodDates: {
            output: { [endYear]: { end: outputEnd } },
            outcome: { [endYear]: { end: outcomeEnd } },
        },
    });

    return { store, dataSets };
}

export async function getDataSetsForPeriods(d2, dataSetIds) {
    const dataSets = await getDataSets(d2, dataSetIds);
    const config = await new Settings(d2).get();
    const store = await DataSetStore.edit(d2, config, dataSetIds[0]);
    const t = d2.i18n.getTranslation.bind(d2.i18n);

    const [startDates, endDates] = _(dataSets)
        .map(dataset => getDataInputDates(dataset, config))
        .map(o => [o.dataInputStartDate, o.dataInputEndDate])
        .unzip()
        .value();

    const areDatesEqual = dates =>
        _(dates)
            .map(date => (date ? date.toISOString() : null))
            .uniq()
            .thru(dates => dates.length === 1)
            .value();

    const allDatesEqual = areDatesEqual(startDates) && areDatesEqual(endDates);

    if (!allDatesEqual) {
        _.assign(store.associations, {
            dataInputStartDate: undefined,
            dataInputEndDate: undefined,
            periodDatesApplyToAll: {
                output: false,
                outcome: false,
            },
            periodDates: {
                output: {},
                outcome: {},
            },
        });
    }

    const warning = allDatesEqual ? null : t("no_match_start_end_dates");

    return { store, dataSets, warning };
}

export function getDataInputDates(dataset, config) {
    const getDate = value => (value ? new Date(value) : undefined);

    const adjustDateString = value =>
        value ? [value.slice(0, 4), value.slice(4, 6), value.slice(6, 8)].join("-") : undefined;

    const startFromDataInputPeriods = _(dataset.dataInputPeriods)
        .map("openingDate")
        .compact()
        .min();
    const endFromDataInputPeriods = _(dataset.dataInputPeriods)
        .map("closingDate")
        .compact()
        .max();

    const attributeValueInterval = dataset.attributeValues.find(
        av => av.attribute.id === config.dataPeriodIntervalDatesAttributeId
    );

    const interval = attributeValueInterval ? attributeValueInterval.value : "";
    const [startFromAttribute, endFromAttribute] = interval.split("-").map(adjustDateString);

    return {
        dataInputStartDate: getDate(startFromAttribute || startFromDataInputPeriods),
        dataInputEndDate: getDate(endFromAttribute || endFromDataInputPeriods),
    };
}

export function formatDate(value) {
    const date = moment(value);
    return value && date.isValid() ? date.format(dataInputPeriodDatesFormat) : "";
}

function formatPeriodDates(dates, years) {
    return _(dates)
        .toPairs()
        .sortBy(([year, _period]) => year)
        .filter(([year, _period]) => years.includes(parseInt(year)))
        .map(([year, { start, end }]) => `${year}=${formatDate(start)}-${formatDate(end)}`)
        .join(",");
}
