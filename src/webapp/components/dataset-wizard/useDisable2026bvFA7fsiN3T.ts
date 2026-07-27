import _ from "$/domain/entities/generic/Collection";
import React from "react";
import { Indicator } from "$/domain/entities/Indicator";
import { DataSet, DisabledField } from "$/domain/entities/DataSet";
import { Id } from "@eyeseetea/d2-api";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { useAppContext } from "$/webapp/contexts/app-context";
import { Future } from "$/domain/entities/generic/Future";

// year and category hardcoded as decided in requirements (869bcnh4t)
const cocToDisable = "bvFA7fsiN3T";
const yearToDisable = 2026;

export function useDisable2026bvFA7fsiN3TOnIndicatorUpdate() {
    const { compositionRoot } = useAppContext();

    const categoryCombinationsMap = React.useRef(HashMap.empty<Id, CategoryCombination>());

    const disable2026bvFA7fsiN3T = React.useCallback(
        (props: { indicators: Indicator[]; dataSet: DataSet }) => {
            const { indicators, dataSet } = props;
            if (dataSet.project?.startDate === undefined) return Future.success(dataSet);

            const startDate = new Date(dataSet.project?.startDate);
            const indicatorsWithCocToDisable = getIndicatorsWith2026bvFA7fsiN3T(indicators);

            if (
                !(startDate.getFullYear() >= yearToDisable && indicatorsWithCocToDisable.size > 0)
            ) {
                return Future.success(dataSet);
            }

            const combinationIds = indicatorsWithCocToDisable
                .map(indicator => indicator.categories.map(category => category.disaggregationId))
                .flatten()
                .compact()
                .value();
            return getAndCacheCategoryCombinations(combinationIds).map(comboMap => {
                if (comboMap) {
                    const disabledFields = indicatorsWithCocToDisable
                        .flatMap(({ indicator, categories }) =>
                            _(categories)
                                .compactMap(({ disaggregationId }) => {
                                    const combination = comboMap.get(disaggregationId);

                                    if (!combination) return;
                                    else {
                                        return combination.optionsCombos
                                            .filter(coc =>
                                                coc.options.some(
                                                    option => option.id === cocToDisable
                                                )
                                            )
                                            .map<DisabledField>(coc => ({
                                                dataElementId: indicator.id,
                                                optionComboId: coc.id,
                                                competencyId: indicator.coreCompetency.id,
                                                type: indicator.type,
                                            }));
                                    }
                                })
                                .flatten()
                        )
                        .concat(dataSet.disabledFields)
                        .uniqBy(
                            field =>
                                `${field.dataElementId}.${field.optionComboId}.${field.type}.${field.competencyId}`
                        )
                        .value();
                    return dataSet.setDisabledFields(disabledFields);
                }
                return dataSet;
            });
        },
        []
    );

    const getAndCacheCategoryCombinations = React.useCallback(
        (combinationsIds: Id[]) => {
            const idsToFetch = _(combinationsIds)
                .filter(id => !categoryCombinationsMap.current.hasKey(id))
                .uniq()
                .value();
            if (!idsToFetch.length) return Future.success(categoryCombinationsMap.current);

            return compositionRoot.combination.getByIds
                .execute(idsToFetch)
                .map(combinations => {
                    const combinationsById = _(combinations).keyBy(combination => combination.id);
                    const updatedMap = categoryCombinationsMap.current.merge(combinationsById);
                    categoryCombinationsMap.current = updatedMap;
                    return updatedMap;
                })
                .flatMapError(() => {
                    console.error("Could not fetch category combination to disable");
                    return Future.success(categoryCombinationsMap.current);
                });
        },
        [compositionRoot]
    );

    return {
        disable2026bvFA7fsiN3T,
    };
}

function getIndicatorsWith2026bvFA7fsiN3T(indicators: Indicator[]) {
    return _(indicators).compactMap(indicator => {
        const disaggregation = indicator.disaggregation;
        if (!disaggregation) return;

        const categories = disaggregation.categories
            .map(category => ({
                category,
                disaggregationId: disaggregation.id,
            }))
            .filter(
                ({ category, disaggregationId }) =>
                    disaggregationId && category.options.some(option => option.id === cocToDisable)
            )
            .map(({ category, disaggregationId }) => ({ category, disaggregationId }));
        if (categories?.length) {
            return { indicator, categories };
        }
    });
}

export function disableCategoryOptionFor2026(optionIds: string[], projectStartDate?: string) {
    if (!projectStartDate) return false;

    const startDate = new Date(projectStartDate);
    return startDate.getFullYear() >= yearToDisable && optionIds.includes(cocToDisable);
}
