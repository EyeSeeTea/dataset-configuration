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
}) {
    const { dataSet, indicators, selectedIndicators, selectedFilterValue } = props;

    const indicatorsByCode = React.useMemo(
        () =>
            _(indicators)
                .filter(indicator => Boolean(indicator.code))
                .keyBy(indicator => indicator.code),
        [indicators]
    );

    const indicatorsWithCompanion = React.useMemo(() => {
        const currentIndicators = dataSet.indicators.filter(indicator =>
            selectedIndicators.includes(indicator.id)
        );

        return currentIndicators.flatMap((indicator): IndicatorColumn[] => {
            const companionCodes = indicator.getCompanionCodesFromRules();

            const indicatorCompanion = _(companionCodes)
                .compactMap(code => {
                    const indicatorDetails = indicatorsByCode.get(code);
                    if (!indicatorDetails) return undefined;

                    return { ...indicatorDetails, parentCompanionName: indicator.name };
                })
                .uniqBy(indicator => indicator.id)
                .value();
            return indicatorCompanion;
        });
    }, [indicatorsByCode, selectedIndicators, dataSet]);

    return indicatorsWithCompanion.filter(indicator => {
        if (!selectedFilterValue) return true;
        return selectedFilterValue === "selected"
            ? selectedIndicators.includes(indicator.id)
            : !selectedIndicators.includes(indicator.id);
    });
}

export function useIndicatorsTableColumns(props: {
    showCompanionColumn: boolean;
    statusIndicator: (indicator: Indicator) => React.ReactNode;
}): IndicatorColumns {
    const { showCompanionColumn, statusIndicator } = props;
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
    }, [showCompanionColumn, statusIndicator]);
}

export type IndicatorColumns = ObjectsTableProps<IndicatorColumn>["columns"];
export type IndicatorColumn = Pick<
    Indicator,
    "id" | "name" | "theme" | "group" | "status" | "disaggregation"
> & {
    parentCompanionName?: string;
};
