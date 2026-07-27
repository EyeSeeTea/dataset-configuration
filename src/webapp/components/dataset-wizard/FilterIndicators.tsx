import React from "react";
import styled from "styled-components";
import { Typography } from "@material-ui/core";
import { Dropdown, DropdownItem } from "@eyeseetea/d2-ui-components";

import i18n from "$/utils/i18n";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { IndicatorPerItem } from "$/webapp/components/dataset-wizard/IndicatorsDataSet";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { Maybe } from "$/utils/ts-utils";
import { ChipFilter, ChipItem } from "$/webapp/components/dataset-wizard/ChipFilter";

export type FilterType = "scope" | "coreCompetency" | "outputType" | "theme" | "measure" | "MLF";

export type FilterIndicatorsProps = {
    indicatorsPerCompetency: IndicatorPerItem[];
    indicatorsPerType: IndicatorPerItem[];
    coreCompetencies: CoreCompetency[];
    coreValues: string[];
    measure: string;
    measures: string[];
    onFilterChange: (scope: ChipItem[], type: FilterType) => void;
    scopes: DropdownItem[];
    scopeValue: string[];
    themes: string[];
    theme: string;
    types: string[];
    selectedType: string;
    hidden: boolean;
    masterLogFrames: {
        data: MasterLogFrame[];
        error: Maybe<string>;
        loading: boolean;
        value: string;
    };
};

export const FilterIndicators = React.memo((props: FilterIndicatorsProps) => {
    const {
        coreCompetencies,
        coreValues,
        measure,
        measures,
        onFilterChange,
        scopes,
        scopeValue,
        themes,
        theme,
        types,
        selectedType,
        indicatorsPerCompetency,
        indicatorsPerType,
        hidden: hide,
        masterLogFrames,
    } = props;

    const coreCompetenciesItems = generateCoreCompetencies(
        coreCompetencies,
        indicatorsPerCompetency
    );

    return (
        !hide && (
            <>
                <ChipFilter
                    items={scopes}
                    label={i18n.t("Origin")}
                    onChange={value => onFilterChange(value, "scope")}
                    value={scopeValue}
                />

                <ChipFilter
                    items={coreCompetenciesItems}
                    label={i18n.t("Core competencies")}
                    onChange={value => onFilterChange(value, "coreCompetency")}
                    value={coreValues}
                    mode="multiple"
                />

                <ChipFilter
                    items={generateTypesItems(types, indicatorsPerType)}
                    label={i18n.t("Type")}
                    onChange={value => onFilterChange(value, "outputType")}
                    value={[selectedType]}
                    mode="single"
                />

                {masterLogFrames.error ? (
                    <Typography variant="body1" color="error">
                        {i18n.t("Error loading MLF's: {{error}}", {
                            error: masterLogFrames.error,
                            nsSeparator: false,
                        })}
                    </Typography>
                ) : (
                    <ChipFilter
                        items={generateMlfItems(masterLogFrames.data, selectedType)}
                        label={
                            masterLogFrames.loading
                                ? i18n.t("Loading...")
                                : i18n.t("Master Log Frames")
                        }
                        noItemsMessage={
                            masterLogFrames.loading
                                ? ""
                                : i18n.t("No MLF's available for this dataSet")
                        }
                        onChange={value => onFilterChange(value, "MLF")}
                        value={[masterLogFrames.value]}
                        mode="single"
                        allowEmpty
                    />
                )}

                <BodyFilterContainer>
                    <Typography variant="body1">
                        <strong>{i18n.t("Additional")}</strong>
                    </Typography>
                </BodyFilterContainer>

                <BodyFilterContainer>
                    <Dropdown
                        className="dropdown"
                        items={themes.map(t => ({ text: t, value: t }))}
                        onChange={value =>
                            onFilterChange([{ text: value ?? "", value: value ?? "" }], "theme")
                        }
                        label={i18n.t("Theme")}
                        value={theme}
                    />
                </BodyFilterContainer>

                <BodyFilterContainer>
                    <Dropdown
                        className="dropdown"
                        items={measures.map(g => ({ text: g, value: g }))}
                        onChange={value =>
                            onFilterChange([{ text: value ?? "", value: value ?? "" }], "measure")
                        }
                        label={i18n.t("Measure")}
                        value={measure}
                    />
                </BodyFilterContainer>
            </>
        )
    );
});

function generateCoreCompetencies(
    coreCompetencies: CoreCompetency[],
    indicatorsPerCompetency: IndicatorPerItem[]
) {
    return coreCompetencies.map(coreCompetency =>
        createItem(coreCompetency.name, coreCompetency.id, indicatorsPerCompetency)
    );
}

function generateTypesItems(types: string[], indicatorsPerCompetency: IndicatorPerItem[]) {
    return types.map(type => createItem(type, type, indicatorsPerCompetency, type.toLowerCase()));
}

function generateMlfItems(masterLogFrames: MasterLogFrame[], selectedType: string) {
    return masterLogFrames
        .filter(mlf => mlf.type.toLowerCase() === selectedType.toLowerCase())
        .map(mlf => ({ text: mlf.name, value: mlf.id }));
}

function createItem(
    label: string,
    value: string,
    indicatorsPerCompetency: IndicatorPerItem[],
    conditionValue?: string
) {
    const valueToCompare = conditionValue ?? value;
    const indicator = indicatorsPerCompetency.find(item => item.id === valueToCompare);
    const totalIndicators = indicator ? `(${indicator.totalIndicators})` : "";
    return { text: `${label} ${totalIndicators}`, value };
}

const BodyFilterContainer = styled.div`
    padding-inline: 1em;
`;
