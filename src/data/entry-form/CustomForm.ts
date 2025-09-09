// ignoring htmlencode because does not have types: @types/htmlencode
// @ts-ignore
import htmlencode from "htmlencode";
import isEqual from "lodash/isEqual";

import _ from "$/domain/entities/generic/Collection";
import velocity from "./velocity";
import { DataSet, DisabledField } from "$/domain/entities/DataSet";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { D2ApiCategoryComboType } from "$/data/D2ApiCategoryCombo";
import i18n from "$/utils/i18n";
import { Indicator, IndicatorAttrs } from "$/domain/entities/Indicator";
import { Maybe } from "$/utils/ts-utils";
import { NamedRef, Ref } from "$/domain/entities/Ref";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { D2Config } from "$/data/repositories/D2ApiMetadata";
import { D2Section } from "$/data/repositories/DataSetD2Repository";
import { convertAttributeValueToDate } from "$/data/utils";
import templateVelocity from "$/data/entry-form/template.vm?raw";
import templateJs from "$/data/entry-form/template.js?raw";
import templateCss from "$/data/entry-form/template.css?raw";
import { toISODateWithoutTimezone } from "$/utils/date";

function getCategoryCombo(dataSetElement: DataSetTemplate["dataSetElements"][0]) {
    const { categoryCombo } = dataSetElement;

    if (categoryCombo.id) {
        return { id: categoryCombo.id };
    } else {
        throw new Error(
            `Cannot get category combo for dataSetElement: ${JSON.stringify(dataSetElement)}`
        );
    }
}

class CustomFormMap<T> {
    obj: CustomFormMapType<T>;
    constructor(obj: CustomFormMapType<T>) {
        this.obj = obj;
    }

    keys() {
        return Object.keys(this.obj).sort();
    }

    get(key: string) {
        if (this.obj[key] !== undefined) {
            return this.obj[key];
        } else {
            const keys = JSON.stringify(Object.keys(this.obj), null, 4);
            throw new Error(
                `[post-custom-form] No key ${JSON.stringify(key)} in object with keys: ${keys}`
            );
        }
    }

    getOr(key: string, defaultValue: T) {
        return this.obj[key] !== undefined ? this.obj[key] : defaultValue;
    }
}

const map = <T>(obj: CustomFormMapType<T>) => new CustomFormMap(obj);

const createViewDataElement = (de: DataElementViewTemplate) => ({
    id: de.id,
    displayFormName: de.displayName,
    url: de.href,
    hasUrl: () => Boolean(de.href),
    valueType: de.valueType,
    optionSet: de.optionSetValue,
    hasDescription: () => Boolean(de.description),
    displayDescription: de.description,
});

type Grouped<T> = T[] | CustomFormMap<Grouped<T> | string | undefined>;

function groupByKeys(objs: ItemsSection[], keys: string[]): Grouped<ItemsSection> {
    if (keys.length === 0) {
        return objs;
    } else {
        const firstKey = keys[0] as "theme" | "group";
        const groupByKey = _(objs)
            .groupBy(section => section[firstKey])
            .toObject();

        const includeThemeAndGroup = HashMap.fromObject(groupByKey)
            .mapValues(([k, vs]) => [k, groupByKeys(vs, keys.slice(1))])
            .values();

        const sectionItemsByKey = _(includeThemeAndGroup)
            .toHashMap(([k, vs]) => [k, vs])
            .toObject();

        return map(sectionItemsByKey);
    }
}

const getVisibleOptionCombos = (
    greyedFields: Record<string, boolean>,
    optionCombos: Ref[],
    dataElements: Ref[]
) => optionCombos.filter(coc => dataElements.some(de => !greyedFields[`${de.id}.${coc.id}`]));

const getGroupedItems = (sections: SectionTemplate[]) =>
    _(sections)
        .toHashMap(section => {
            const groupedValues = HashMap.fromObject(section.items).values();
            const groupedItemsForSection = groupByKeys(
                _(groupedValues)
                    .sortBy(x => x.displayName)
                    .value(),
                ["theme", "group"]
            );
            return [section.id, groupedItemsForSection];
        })
        .toObject();

const getKey = (cos: Ref[]) =>
    _(cos)
        .map(c => c.id)
        .sort()
        .uniq()
        .join("-");

const getOrderedCategoryOptionCombos = (categoryCombos: D2ApiCategoryComboType[]) => {
    return _(categoryCombos)
        .toHashMap(categoryCombo => {
            const categoryOptionsForCategories = _(
                categoryCombo.categories.map(category => category.categoryOptions)
            )
                .cartesian()
                .value();
            const cocByCosKey = _(categoryCombo.categoryOptionCombos)
                .keyBy(coc => getKey(coc.categoryOptions))
                .toObject();
            const orderedCocs = categoryOptionsForCategories.map(cos => cocByCosKey[getKey(cos)]);

            return [categoryCombo.id, orderedCocs];
        })
        .toObject();
};

type CategoryHeader = {
    categoryOptions: Array<NamedRef & { displayName: string }>;
};

const getHeaders = (
    categories: CategoryHeader[],
    categoryOptionCombos: { categoryOptions: Ref[] }[]
) => {
    const categoryOptionsForCategories = categories.map(category => category.categoryOptions);

    const allCategoryOptions = _(categoryOptionsForCategories).cartesian().value();

    const categoryOptionsByCategoryOptionKey = _(allCategoryOptions).keyBy(getKey).toObject();

    return categories.map((_category, catIndex) => {
        const mapValue = categoryOptionCombos.map(
            coc => categoryOptionsByCategoryOptionKey[getKey(coc.categoryOptions)]
        );

        const consecutive = groupConsecutiveBy(mapValue, cos =>
            _(cos ?? [])
                .map(co => co.id)
                .take(catIndex + 1)
                .value()
        );

        return consecutive.map(groupCatOption => {
            const firstItem = groupCatOption[0];
            if (!firstItem) throw Error("groupCatOption is empty");
            const categoryOption = firstItem[catIndex];
            return {
                colSpan: groupCatOption.length,
                name: categoryOption?.name,
                displayName: categoryOption?.displayName,
            };
        });
    });
};

const getRowTotalId = (dataElement: Ref, optionCombos: Ref[]) =>
    ["row", dataElement.id, ...optionCombos.map(coc => coc.id)].join("-");

const getContext = (
    dataset: DataSetTemplate,
    sections: SectionTemplate[],
    allCategoryCombos: D2ApiCategoryComboType[],
    disabledFields: DisabledField[]
) => {
    const categoryComboByDataElementId = _(dataset.dataSetElements)
        .toHashMap(dse => [dse.dataElement.id, getCategoryCombo(dse)])
        .toObject();

    const categoryCombosId = _(dataset.dataSetElements)
        .compactMap(dse => getCategoryCombo(dse).id)
        .uniq()
        .value();

    const categoryCombos = at(
        _(allCategoryCombos)
            .keyBy(x => x.id)
            .toObject(),
        categoryCombosId
    );

    const orderedCategoryOptionCombos = getOrderedCategoryOptionCombos(categoryCombos);

    const orderedCategories = _(categoryCombos)
        .toHashMap(cc => [cc.id, cc.categories])
        .toObject();

    const getDataElementsByCategoryCombo = (dataElements: Ref[]) =>
        mapDataElementRefs(dataElements, categoryComboByDataElementId);

    const getDataElementsByCategoryComboForIndicators = (
        indicators: Array<{ dataElements: NamedRef[] }>
    ) => {
        const allDataElements = indicators.flatMap(indicator => indicator.dataElements);
        const sortedDataElements = _(allDataElements)
            .orderBy([[dataElement => dataElement.name, "desc"]])
            .value();
        return mapDataElementRefs(sortedDataElements, categoryComboByDataElementId);
    };

    const greyedFields = _(disabledFields)
        .toHashMap(disabledField => {
            return [`${disabledField.dataElementId}.${disabledField.optionComboId}`, true];
        })
        .toObject();

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
            getString: (key: string) => {
                const translations = getTranslationsValues();
                return translations[key] ?? "unknown";
            },
        },
        encoder: {
            htmlEncode: htmlencode.htmlEncode,
        },
        auth: {
            // Used in automatic form, cannot be calculated for a static custom form, leave it as true
            hasAccess: (_app: string, _key: string) => true,
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
            return { key: "", name: "" };
    }
}

function getSectionName(item: { name: string }): string {
    const lastSpace = item.name.lastIndexOf(" ");
    return lastSpace !== -1 ? item.name.substring(0, lastSpace) : item.name;
}

const convertToSections = (
    dataSet: DataSetToSave,
    categoryCombos: D2ApiCategoryComboType[],
    existingSections: D2Section[]
): SectionTemplate[] => {
    const result = _(dataSet.indicators ?? [])
        .groupBy(indicator => `${indicator.type}_${indicator.coreCompetency.id}`)
        .mapValues(([key, indicators]) => {
            const [type, _sectionGroupId] = key.split("_");
            const coreCompetency = indicators[0]?.coreCompetency;
            if (!coreCompetency || !type)
                throw Error(`Cannot find core competency name for ${type}`);

            const currentSectionCode = `${dataSet.id}_${type}_${coreCompetency.code}`;
            const currentSection = existingSections.find(
                section => section.code.toLowerCase() === currentSectionCode.toLowerCase()
            );

            const typeLabel = getIndicatorTypeName(type);

            return {
                id: `${coreCompetency.id}-${typeLabel.key}`,
                name: `${coreCompetency.name} ${typeLabel.name}`,
                type: typeLabel.key,
                showColumnTotals: currentSection?.showColumnTotals ?? false,
                showRowTotals: currentSection?.showRowTotals ?? false,
                items: getItemsForSections(indicators, categoryCombos),
            };
        })
        .values();
    return result.sort((a, b) => {
        const sectionA = getSectionName(a);
        const sectionB = getSectionName(b);

        const baseCompare = sectionA.localeCompare(sectionB);
        if (baseCompare !== 0) return baseCompare;

        return b.type.localeCompare(a.type);
    });
};

function getItemsForSections(
    indicators: Indicator[],
    categoryCombos: D2ApiCategoryComboType[]
): Record<string, ItemsSection> {
    const items = _(indicators)
        .map(indicator => {
            const categoryCombo = categoryCombos.find(cc => cc.id === indicator.disaggregation?.id);

            return {
                ...indicator,
                displayName: indicator.name,
                valueType: indicator.valueType,
                categoryCombo,
                // inside the template we compare against null to check if it is empty
                // so we need to convert empty strings to null
                theme: indicator.theme.length > 0 ? indicator.theme : null,
                group: indicator.group.length > 0 ? indicator.group : null,
                dataElements:
                    indicator.type === "outcomes"
                        ? _(indicator.relatedDataElements)
                              .map(dataElement => {
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
                              .value()
                        : [],
            };
        })
        .sortBy(indicator => indicator.displayName)
        .keyBy(indicator => indicator.id)
        .toObject();

    return items;
}

const getTemplate = (
    dataSet: DataSetTemplate,
    categoryCombos: D2ApiCategoryComboType[],
    dataSetToSave: DataSet,
    d2Config: D2Config,
    existingSections: D2Section[]
) => {
    const templateSections = convertToSections(dataSetToSave, categoryCombos, existingSections);
    const { disabledFields } = dataSetToSave;
    const periods = generatePeriods(dataSet, d2Config) ?? {};
    const indicatorMatchingRef = generateIndicatorMatchingReference(dataSetToSave);
    const context = getContext(dataSet, templateSections, categoryCombos, disabledFields);
    const config = { env: "development", escape: false };
    const view = velocity.render(templateVelocity, context, {}, config);
    return `
        <style>${templateCss}</style>
        <script>
            ${templateJs}
            setPeriodDates(${JSON.stringify(periods)});
            setIndicatorMatching(${JSON.stringify(indicatorMatchingRef)})
        </script>
        ${view}
    `;
};

export function groupConsecutiveBy<T, U = T>(xs: T[], mapper: (item: T) => U): T[][] {
    const reducer = (acc: T[][], x: T): T[][] => {
        if (acc.length === 0) {
            return acc.concat([[x]]);
        } else {
            const lastGroup = _(acc).last() as T[];
            const lastElement = lastGroup[lastGroup.length - 1] as T;

            if (isEqual(mapper(lastElement), mapper(x))) {
                lastGroup.push(x);
                return acc;
            } else {
                return acc.concat([[x]]);
            }
        }
    };
    return xs.reduce(reducer, [] as T[][]);
}

export function at<T>(data: Record<string, T>, ids: string[]): T[] {
    return _(ids)
        .filter(key => key in data)
        .compactMap(key => data[key])
        .value();
}

function mapDataElementRefs(
    dataElements: Ref[],
    categoryComboByDataElementId: Record<string, Ref>
): CustomFormMap<Ref[]> {
    const dataElementsGrouped = _(dataElements)
        .groupBy(de => categoryComboByDataElementId[de.id]?.id)
        .toObject();
    return map(dataElementsGrouped);
}

function generatePeriods(dataSet: DataSetTemplate, d2Config: D2Config): Maybe<TemplatePeriodDate> {
    const periodDates = dataSet.attributeValues.find(
        attr => attr.attribute.id === d2Config.attributes.periodDates.id
    );
    if (!periodDates) return undefined;

    const periodDateValidYears = generatePeriodsFromAttributeValues(periodDates);

    return { output: periodDateValidYears, outcome: periodDateValidYears };
}

function generateIndicatorMatchingReference(dataSet: DataSet) {
    return (
        dataSet.indicatorMatching?.map(match => ({
            target: match.target,
            sourceIds: match.sourceIds,
            expression: match.resolvedExpression,
        })) || []
    );
}

function generatePeriodsFromAttributeValues(
    attribute: DataSetTemplate["attributeValues"][number]
): Record<string, TemplateDate> {
    return _(attribute?.value?.split(",") ?? [])
        .compactMap(period => {
            const [year, dates] = period.split("=");
            const [startDate, endDate] = dates?.split("-") ?? [];
            if (!year || !startDate || !endDate) return undefined;
            return [
                year,
                {
                    start: toISODateWithoutTimezone(
                        new Date(convertAttributeValueToDate(startDate))
                    ),
                    end: toISODateWithoutTimezone(new Date(convertAttributeValueToDate(endDate))),
                },
            ] as [string, TemplateDate];
        })
        .toHashMap(([year, dates]) => [year, dates])
        .toObject();
}

function getTranslationsValues(): Record<string, string> {
    return {
        value: i18n.t("Value"),
        total: i18n.t("Total"),
        no_value: i18n.t("No value"),
        yes: i18n.t("Yes"),
        no: i18n.t("No"),
        section: i18n.t("Section"),
        current_date_out_of_period: i18n.t("Current date out of accepted period"),
    };
}

type TemplatePeriodDate = {
    output: Record<string, TemplateDate>;
    outcome: Record<string, TemplateDate>;
};
type TemplateDate = { start: string; end: string };

type ItemsSection = Omit<IndicatorAttrs, "theme" | "group"> & {
    displayName: string;
    valueType: string;
    categoryCombo: Maybe<D2ApiCategoryComboType>;
    theme: string | null;
    group: string | null;
};

type SectionTemplate = {
    id: string;
    name: string;
    type: string;
    showColumnTotals: boolean;
    showRowTotals: boolean;
    items: Record<string, ItemsSection>;
};

export type DataSetTemplate = {
    attributeValues: Array<{ attribute: { id: string }; value: string | undefined }>;
    renderAsTabs: boolean;
    dataElementDecoration: boolean;
    dataSetElements: Array<{
        dataElement: { id: string };
        categoryCombo: CategoryComboTemplate;
    }>;
};

type CategoryComboTemplate = { id: string | undefined };
type DataElementViewTemplate = {
    id: string;
    displayName: string;
    href: string;
    valueType: string;
    optionSet: string;
    description: string;
    optionSetValue: string;
};

type CustomFormMapType<T> = Record<string, T>;

export default getTemplate;
