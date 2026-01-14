import _ from "$/domain/entities/generic/Collection";
import React from "react";
import { IndicatorCombination } from "$/domain/entities/Indicator";
import { Maybe } from "$/utils/ts-utils";
import { Category } from "$/domain/entities/Category";
import { DataSet } from "$/domain/entities/DataSet";
import { Id } from "@eyeseetea/d2-api";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { CategoryOptionCombo } from "$/webapp/components/dataset-wizard/GreyFieldsStep";
import { generateGreyFieldsFromDataElements } from "$/webapp/components/dataset-wizard/grey-fields/components";

// year and category hardcoded as decided in requirements (869bcnh4t)
export function useDisable2026bvFA7fsiN3T(props: {
    combinations: IndicatorCombination[];
    combinationById: Maybe<Record<string, CategoryOptionCombo>>;
    greyedFields: Record<string, boolean>;
    uniqueCategories: Category[];
    dataSet: DataSet;
    updateOptions: (optionId: string, checked: boolean) => void;
}) {
    const {
        combinations,
        combinationById,
        greyedFields,
        uniqueCategories,
        dataSet,
        updateOptions,
    } = props;
    const combinationDataById = React.useMemo(
        () => _(combinations).keyBy(combination => combination.id),
        [combinations]
    );
    React.useEffect(() => {
        if (
            !combinationById ||
            (Object.keys(greyedFields).length > 0 &&
                areAllCOCbvFA7fsiN3TSelected({
                    combinationById,
                    greyedFields,
                    combinationDataById,
                }))
        )
            return;
        uniqueCategories.forEach(category =>
            category.options.forEach(option => {
                if (disableCategoryOptionFor2026([option.id], dataSet?.project?.startDate)) {
                    updateOptions(option.id, false);
                }
            })
        );
    }, [combinations, combinationById, greyedFields]);
}

const cocToDisable = "bvFA7fsiN3T";
const yearToDisable = 2026;

export function disableCategoryOptionFor2026(optionIds: string[], projectStartDate?: string) {
    if (!projectStartDate) return false;

    const startDate = new Date(projectStartDate);
    return startDate.getFullYear() >= yearToDisable && optionIds.includes(cocToDisable);
}

function areAllCOCbvFA7fsiN3TSelected(props: {
    combinationById: Record<string, CategoryOptionCombo>;
    greyedFields: Record<string, boolean>;
    combinationDataById: HashMap<Id, IndicatorCombination>;
}) {
    const { combinationById, greyedFields, combinationDataById } = props;

    const fieldIds = _(Object.keys(combinationById))
        .filter(key => key.includes(cocToDisable))
        .map(key => {
            const combination = combinationById[key];
            if (combination) {
                const combinationData = combinationDataById.get(combination.categoryComboId);
                return {
                    id: combination.id,
                    dataElements: combinationData?.dataElements ?? [],
                };
            }
        })
        .compact()
        .map(({ id, dataElements }) => generateGreyFieldsFromDataElements(dataElements, [{ id }]))
        .flatten()
        .value();

    return fieldIds.every(key => greyedFields[key]);
}
