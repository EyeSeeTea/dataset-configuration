import React from "react";

import i18n from "$/utils/i18n";
import { ChipFilter, ChipItem } from "$/webapp/components/dataset-wizard/ChipFilter";

export type FilterCompanionIndicatorsProps = {
    onFilterChange: (value: ChipItem[]) => void;
    scopes: ChipItem[];
    scopeValue: string[];
    hidden: boolean;
};

export const FilterCompanionIndicators = React.memo((props: FilterCompanionIndicatorsProps) => {
    const { onFilterChange, scopes, scopeValue, hidden: hide } = props;

    if (hide) return null;

    return (
        <>
            <ChipFilter
                items={scopes}
                label={i18n.t("Showing suggested indicators for years")}
                onChange={onFilterChange}
                value={scopeValue}
                mode={"multiple"}
            />
        </>
    );
});
