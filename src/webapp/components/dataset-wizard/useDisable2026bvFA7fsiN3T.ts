import _ from "$/domain/entities/generic/Collection";
import React from "react";
import { Indicator, IndicatorType } from "$/domain/entities/Indicator";
import { DataSet, DisabledField } from "$/domain/entities/DataSet";
import { Id } from "@eyeseetea/d2-api";
import { Maybe } from "$/utils/ts-utils";
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

    const resolveOutcomeRelatedDataElements = React.useCallback(
        (props: { indicators: Indicator[]; dataSet: DataSet; existingIndicatorIds: Id[] }) => {
            const { indicators, dataSet, existingIndicatorIds } = props;
            const needsResolution = indicators.some(
                indicator =>
                    indicator.type === "outcomes" &&
                    indicator.relatedDataElements.length === 0 &&
                    !existingIndicatorIds.includes(indicator.id)
            );
            if (!needsResolution) return Future.success(indicators);

            return compositionRoot.indicators.getRelated.execute({
                dataSet,
                indicatorIdsToIgnore: existingIndicatorIds,
            });
        },
        [compositionRoot]
    );

    const disable2026bvFA7fsiN3T = React.useCallback(
        (props: { indicators: Indicator[]; dataSet: DataSet; existingIndicatorIds: Id[] }) => {
            const { indicators, dataSet, existingIndicatorIds } = props;
            if (dataSet.project?.startDate === undefined) return Future.success(dataSet);

            const startDate = new Date(dataSet.project.startDate);
            if (startDate.getFullYear() < yearToDisable) return Future.success(dataSet);

            // Resolve outcome relatedDataElements here so disabling applies even if the
            // disaggregation step (where they are normally loaded) is skipped.
            return resolveOutcomeRelatedDataElements({
                indicators,
                dataSet,
                existingIndicatorIds,
            }).flatMap(resolvedIndicators => {
                const dataSetWithIndicators = dataSet.setIndicators(resolvedIndicators);
                const disableTargets = getDisableTargetsWith2026bvFA7fsiN3T(resolvedIndicators);
                if (disableTargets.length === 0) return Future.success(dataSetWithIndicators);

                const combinationIds = _(disableTargets)
                    .map(target => target.disaggregationId)
                    .uniq()
                    .value();
                return getAndCacheCategoryCombinations(combinationIds).map(comboMap => {
                    const disabledFields = _(disableTargets)
                        .flatMap(target =>
                            _(comboMap.get(target.disaggregationId)?.optionsCombos ?? [])
                                .filter(coc =>
                                    coc.options.some(option => option.id === cocToDisable)
                                )
                                .map<DisabledField>(coc => ({
                                    dataElementId: target.dataElementId,
                                    optionComboId: coc.id,
                                    competencyId: target.competencyId,
                                    type: target.type,
                                }))
                        )
                        .concat(dataSetWithIndicators.disabledFields)
                        .uniqBy(
                            field =>
                                `${field.dataElementId}.${field.optionComboId}.${field.type}.${field.competencyId}`
                        )
                        .value();
                    return dataSetWithIndicators.setDisabledFields(disabledFields);
                });
            });
        },
        [getAndCacheCategoryCombinations, resolveOutcomeRelatedDataElements]
    );

    return {
        disable2026bvFA7fsiN3T,
    };
}

type DisableTarget = {
    dataElementId: Id;
    disaggregationId: Id;
    competencyId: Id;
    type: IndicatorType;
};

// Outputs render the indicator itself; outcomes render their relatedDataElements, so the
// disabled field must key on the rendered element to reach the data-entry form.
function getDisableTargetsWith2026bvFA7fsiN3T(indicators: Indicator[]): DisableTarget[] {
    return _(indicators)
        .flatMap(indicator => {
            const dataElementDisaggregations =
                indicator.type === "outcomes"
                    ? indicator.relatedDataElements
                          .filter(dataElement => !dataElement.isComment)
                          .map(dataElement => ({
                              dataElementId: dataElement.id,
                              disaggregation: dataElement.disaggregation,
                          }))
                    : [{ dataElementId: indicator.id, disaggregation: indicator.disaggregation }];

            return _(dataElementDisaggregations).compactMap(
                ({ dataElementId, disaggregation }): Maybe<DisableTarget> => {
                    if (!disaggregation) return undefined;
                    const hasOptionToDisable = disaggregation.categories.some(category =>
                        category.options.some(option => option.id === cocToDisable)
                    );
                    if (!hasOptionToDisable) return undefined;
                    return {
                        dataElementId,
                        disaggregationId: disaggregation.id,
                        competencyId: indicator.coreCompetency.id,
                        type: indicator.type,
                    };
                }
            );
        })
        .value();
}

export function disableCategoryOptionFor2026(optionIds: string[], projectStartDate?: string) {
    if (!projectStartDate) return false;

    const startDate = new Date(projectStartDate);
    return startDate.getFullYear() >= yearToDisable && optionIds.includes(cocToDisable);
}
