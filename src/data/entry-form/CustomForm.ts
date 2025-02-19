// @ts-nocheck
import velocity from "velocityjs";
import htmlencode from "htmlencode";
import _ from "lodash";

import customFormTemplate from "./sectionForm.vm?raw";
import customFormJs from "./script.js?raw";
import customFormCss from "./style.css?raw";
import { DataSet } from "$/domain/entities/DataSet";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { D2ApiCategoryComboType } from "$/data/D2ApiCategoryCombo";
import { groupConsecutiveBy } from "$/webapp/components/dataset-wizard/GreyFieldsStep";
import i18n from "$/utils/i18n";

const data = {
    template: customFormTemplate,
    css: customFormCss,
    js: customFormJs,
};

const a = obj => (obj.toArray ? obj.toArray() : obj);
const _a = (...args) => _(a(...args));

function getCategoryCombo(dataSetElement) {
    const { dataElement, categoryCombo } = dataSetElement;

    if (categoryCombo) {
        return categoryCombo;
    } else if (dataElement && dataElement.categoryCombo) {
        return dataElement.categoryCombo;
    } else {
        throw new Error(
            `Cannot get category combo for dataSetElement: ${JSON.stringify(dataSetElement)}`
        );
    }
}

class Map {
    constructor(obj) {
        this.obj = obj;
    }

    keys() {
        return Object.keys(this.obj).sort();
    }

    get(key) {
        if (this.obj[key] !== undefined) {
            return this.obj[key];
        } else {
            const keys = JSON.stringify(Object.keys(this.obj), null, 4);
            throw new Error(
                `[post-custom-form] No key ${JSON.stringify(key)} in object with keys: ${keys}`
            );
        }
    }

    getOr(key, defaultValue) {
        return this.obj[key] !== undefined ? this.obj[key] : defaultValue;
    }
}

const map = obj => new Map(obj);

const createViewDataElement = de => ({
    id: de.id,
    displayFormName: de.displayName,
    url: de.href,
    hasUrl: () => !!de.href,
    valueType: de.valueType,
    optionSet: de.optionSetValue,
    hasDescription: () => !!de.description,
    displayDescription: de.description,
});

function groupByKeys(objs, keys, thruFn = _.identity) {
    if (_(keys).isEmpty()) {
        return objs;
    } else {
        return _(objs)
            .groupBy(keys[0])
            .map((vs, k) => [k, groupByKeys(vs, keys.slice(1), thruFn)])
            .fromPairs()
            .thru(thruFn)
            .value();
    }
}

const getVisibleOptionCombos = (greyedFields, optionCombos, dataElements) =>
    _a(optionCombos)
        .filter(coc => _a(dataElements).some(de => !greyedFields[`${de.id}.${coc.id}`]))
        .value();

const getGroupedItems = sections =>
    _a(sections)
        .map(section => {
            const groupedValues = _a(section.items).values();
            const groupedItemsForSection = groupByKeys(groupedValues, ["theme", "group"], map);
            return [section.id, groupedItemsForSection];
        })
        .fromPairs()
        .value();

const getKey = cos => _a(cos).map("id").sortBy().uniq().join("-");

const getOrderedCategoryOptionCombos = categoryCombos =>
    _a(categoryCombos)
        .map(categoryCombo => {
            const categoryOptionsForCategories = _.product(
                ...a(categoryCombo.categories).map(category => a(category.categoryOptions))
            );
            const cocByCosKey = _.keyBy(a(categoryCombo.categoryOptionCombos), coc =>
                getKey(coc.categoryOptions)
            );
            const orderedCocs = a(categoryOptionsForCategories).map(
                cos => cocByCosKey[getKey(cos)]
            );

            return [categoryCombo.id, orderedCocs];
        })
        .fromPairs()
        .value();

const getHeaders = (categories, categoryOptionCombos) => {
    const categoryOptionsForCategories = a(categories).map(category => a(category.categoryOptions));
    const allCategoryOptions = _.product(...categoryOptionsForCategories);
    const categoryOptionsByCategoryOptionKey = _.keyBy(allCategoryOptions, getKey);
    return a(categories).map((category, catIndex) => {
        const mapValue = _a(categoryOptionCombos)
            .map(coc => categoryOptionsByCategoryOptionKey[getKey(coc.categoryOptions)])
            .value();
        const consecutive = groupConsecutiveBy(mapValue, cos =>
            _a(cos)
                .map(co => co.id)
                .take(catIndex + 1)
                .value()
        );
        return _(consecutive)
            .map(group => {
                const categoryOption = group[0][catIndex];
                return {
                    colSpan: group.length,
                    name: categoryOption.name,
                    displayName: categoryOption.displayName,
                };
            })
            .value();
    });
};

const getRowTotalId = (dataElement, optionCombos) =>
    ["row", dataElement.id, ...a(optionCombos).map(coc => coc.id)].join("-");

const getContext = (
    dataset,
    sections,
    allCategoryCombos,
    disabledFields: DataSet["disabledFields"]
) => {
    const categoryComboByDataElementId = _a(dataset.dataSetElements)
        .map(dse => [dse.dataElement.id, getCategoryCombo(dse)])
        .fromPairs()
        .value();
    const categoryCombosId = _a(dataset.dataSetElements)
        .map(dse => getCategoryCombo(dse).id)
        .uniq()
        .value();
    const categoryCombos = _a(allCategoryCombos).keyBy("id").at(categoryCombosId).value();
    const orderedCategoryOptionCombos = getOrderedCategoryOptionCombos(categoryCombos);
    const orderedCategories = _a(categoryCombos)
        .map(cc => [cc.id, cc.categories])
        .fromPairs()
        .value();
    const getDataElementsByCategoryCombo = dataElements =>
        _a(dataElements)
            .groupBy(de => categoryComboByDataElementId[de.id].id)
            .thru(map)
            .value();
    const getDataElementsByCategoryComboForIndicators = indicators =>
        _a(indicators)
            .flatMap("dataElements")
            .groupBy(de => categoryComboByDataElementId[de.id].id)
            .thru(map)
            .value();

    const greyedFields = disabledFields.reduce((acc, fieldId) => {
        return {
            ...acc,
            [`${fieldId.dataElementId}.${fieldId.optionComboId}`]: true,
        };
    }, {} as Record<string, boolean>);

    return {
        helpers: {
            getDataElementsByCategoryCombo,
            getDataElementsByCategoryComboForIndicators,
            createViewDataElement,
            getHeaders,
            getVisibleOptionCombos: getVisibleOptionCombos.bind(null, greyedFields),
            getRowTotalId,
        },
        i18n: {
            getString: key => {
                switch (key) {
                    case "value":
                        return i18n.t("Value");
                    case "total":
                        return i18n.t("Total");
                    case "no_value":
                        return i18n.t("No value");
                    case "yes":
                        return i18n.t("Yes");
                    case "no":
                        return i18n.t("No");
                    case "section":
                        return i18n.t("Section");
                    case "current_date_out_of_period":
                        return i18n.t("Current date out of accepted period");
                }
            },
        },
        encoder: {
            htmlEncode: htmlencode.htmlEncode,
        },
        auth: {
            // Used in automatic form, cannot be calculated for a static custom form, leave it as true
            hasAccess: (_app, _key) => true,
        },
        dataSet: {
            renderAsTabs: dataset.renderAsTabs,
            dataElementDecoration: dataset.dataElementDecoration,
        },
        sections: sections,
        groupedItems: map(getGroupedItems(sections)),
        orderedCategoryOptionCombos: map(orderedCategoryOptionCombos),
        orderedCategories: map(orderedCategories),
        greyedFields: map(greyedFields),
    };
};

function getIndicatorTypeName(type: string): { key: string; name: string } {
    switch (type) {
        case "outputs":
            return { key: "output", name: "Outputs" };
        case "outcomes":
            return { key: "outcome", name: "Outcomes" };
        default:
            return "";
    }
}

const convertToSections = (dataSet: DataSetToSave, categoryCombos: D2ApiCategoryComboType[]) => {
    const result = _(dataSet.indicators ?? [])
        .groupBy(indicator => `${indicator.type}_${indicator.coreCompetency.id}`)
        .map((indicators, key) => {
            const [type, _sectionGroupId] = key.split("_");
            const coreCompetency = indicators[0]?.coreCompetency;
            if (!coreCompetency || !type)
                throw Error(`Cannot find core competency name for ${indicatorType}`);

            const typeLabel = getIndicatorTypeName(type);

            const items = _(indicators)
                .map(indicator => {
                    const categoryCombo = categoryCombos.find(
                        cc => cc.id === indicator.disaggregation?.id
                    );

                    return {
                        ...indicator,
                        displayName: indicator.name,
                        valueType: indicator.valueType,
                        categoryCombo,
                        dataElements:
                            indicator.type === "outcomes"
                                ? indicator.relatedDataElements.map(dataElement => {
                                      const categoryCombo = categoryCombos.find(
                                          cc => cc.id === dataElement.disaggregation?.id
                                      );
                                      return {
                                          ...dataElement,
                                          categoryCombo,
                                          displayName: dataElement.name,
                                          valueType: dataElement.valueType,
                                      };
                                  })
                                : [],
                    };
                })
                .keyBy(indicator => indicator.id)
                .value();

            return {
                id: `${coreCompetency.id}-${typeLabel.key}`,
                name: `${coreCompetency.name} ${typeLabel.name}`,
                type: typeLabel.key,
                showColumnTotals: false,
                showRowTotals: false,
                items,
            };
        })
        .value();
    return result;
};

const getTemplate = (dataset, _periodDates, _sections, categoryCombos, dataSetToSave: DataSet) => {
    const templateSections = convertToSections(dataSetToSave, categoryCombos);
    const { disabledFields } = dataSetToSave;
    const context = getContext(dataset, templateSections, categoryCombos, disabledFields);
    const config = { env: "development", escape: false };
    const htmlForm = velocity.render(data.template, context, {}, config);
    return `
        <style>${data.css}</style>
        <script>
            ${data.js}
        </script>
        ${htmlForm}
    `;
};

export default getTemplate;
