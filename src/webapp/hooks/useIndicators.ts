import React from "react";

import { DataSet } from "$/domain/entities/DataSet";
import { Indicator } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import { SelectedFilterValue } from "$/webapp/components/dataset-wizard/IndicatorsDataSet";
import _ from "$/domain/entities/generic/Collection";
import { ObjectsTableProps } from "@eyeseetea/d2-ui-components";
import i18n from "$/utils/i18n";

export function useGetCompanionIndicators(props: {
    indicators: Indicator[];
    selectedIndicators: Id[];
    dataSet: DataSet;
    selectedFilterValue: Maybe<SelectedFilterValue>;
    selectedCompanionScope: string[];
}) {
    const { dataSet, indicators, selectedIndicators, selectedFilterValue, selectedCompanionScope } =
        props;

    const indicatorsByCode = React.useMemo(
        () =>
            _(indicators)
                .filter(indicator => Boolean(indicator.code))
                .keyBy(indicator => indicator.code.toLowerCase()),
        [indicators]
    );

    const allCompanionIndicators = React.useMemo(() => {
        const currentIndicators = dataSet.indicators.filter(indicator =>
            selectedIndicators.includes(indicator.id)
        );

        return currentIndicators.flatMap((indicator): IndicatorColumn[] => {
            const companionCodesScope = indicator.getCompanionCodesScope();

            const indicatorCompanion = _(companionCodesScope.keys())
                .compactMap(code => {
                    const indicatorDetails = indicatorsByCode.get(code.toLowerCase());
                    if (!indicatorDetails) return undefined;

                    const indicatorScopes = companionCodesScope.get(code);
                    const isScopeSelected =
                        selectedCompanionScope.length === 0 ||
                        (indicatorScopes &&
                            selectedCompanionScope.some(scope => indicatorScopes.includes(scope)));

                    if (!isScopeSelected) return null;

                    return {
                        ...indicatorDetails,
                        parentCompanionName: indicator.name,
                        suggestedScope: indicatorScopes?.join(", "),
                    };
                })
                .uniqBy(indicator => indicator.id)
                .value();
            return indicatorCompanion;
        });
    }, [indicatorsByCode, selectedIndicators, dataSet, selectedCompanionScope]);

    return allCompanionIndicators.filter(indicator => {
        if (!selectedFilterValue) return true;
        return selectedFilterValue === "selected"
            ? selectedIndicators.includes(indicator.id)
            : !selectedIndicators.includes(indicator.id);
    });
}

export function useIndicatorsTableColumns(props: {
    showCompanionColumn: boolean;
    statusIndicator: (indicator: Indicator) => React.ReactNode;
    hasCompanionScopes: boolean;
}): IndicatorColumns {
    const { showCompanionColumn, statusIndicator, hasCompanionScopes } = props;
    return React.useMemo(() => {
        return [
            {
                name: "id",
                text: i18n.t("Id"),
                hidden: true,
            },
            {
                name: "name",
                text: i18n.t("Name"),
            },
            {
                name: "parentCompanionName",
                text: i18n.t("Companion"),
                hidden: !showCompanionColumn,
            },
            {
                name: "suggestedScope",
                text: i18n.t("Suggested year(s)"),
                hidden: !showCompanionColumn || !hasCompanionScopes,
            },
            {
                name: "theme",
                text: i18n.t("Theme"),
            },
            {
                name: "group",
                text: i18n.t("Group"),
            },
            {
                name: "status",
                text: i18n.t("Status"),
                getValue: statusIndicator,
            },
            {
                name: "disaggregation",
                text: i18n.t("Disaggregation"),
            },
        ];
    }, [showCompanionColumn, statusIndicator, hasCompanionScopes]);
}

export type IndicatorColumns = ObjectsTableProps<IndicatorColumn>["columns"];
export type IndicatorColumn = Pick<
    Indicator,
    "id" | "name" | "theme" | "group" | "status" | "disaggregation"
> & {
    parentCompanionName?: string;
    suggestedScope?: string;
};
