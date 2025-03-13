import React from "react";
import styled from "styled-components";
import { Chip, Divider, Drawer, Grid, IconButton, Typography } from "@material-ui/core";

import FilterListIcon from "@material-ui/icons/FilterList";
import CloseIcon from "@material-ui/icons/Close";
import i18n from "$/utils/i18n";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import { CoreCompetency } from "$/domain/entities/DataSet";
import _ from "$/domain/entities/generic/Collection";
import { IndicatorPerItem } from "$/webapp/components/dataset-wizard/IndicatorsDataSet";

export type FilterType = "scope" | "coreCompetency" | "outputType" | "theme" | "group";

export type FilterIndicatorsProps = {
    indicatorsPerCompetency: IndicatorPerItem[];
    indicatorsPerType: IndicatorPerItem[];
    coreCompetencies: CoreCompetency[];
    coreValues: string[];
    groups: string[];
    group: string;
    onClose: () => void;
    onFilterChange: (scope: ChipItem[], type: FilterType) => void;
    scopes: string[];
    scopeValue: string[];
    showCloseButton?: boolean;
    themes: string[];
    theme: string;
    types: string[];
    selectedType: string;
};

export type FilterWrapperProps = {
    mode: FilterMode;
    children: React.JSX.Element;
    showDrawer: boolean;
};

export type FilterMode = "default" | "drawer";

export const FilterWrapper = React.memo((props: FilterWrapperProps) => {
    const { children, mode, showDrawer } = props;
    switch (mode) {
        case "default":
            return (
                <Grid item lg={3}>
                    {children}
                </Grid>
            );
        case "drawer":
            return <Drawer open={showDrawer}>{children}</Drawer>;
        default:
            return null;
    }
});

export const FilterIndicators = React.memo((props: FilterIndicatorsProps) => {
    const {
        coreCompetencies,
        coreValues: coreValue,
        groups,
        group,
        onClose,
        onFilterChange,
        scopes,
        scopeValue,
        showCloseButton,
        themes,
        theme,
        types,
        selectedType,
        indicatorsPerCompetency,
        indicatorsPerType,
    } = props;

    const coreCompetenciesItems = generateCoreCompetencies(
        coreCompetencies,
        indicatorsPerCompetency
    );

    return (
        <FilterIndicatorContainer style={{ maxWidth: "300px" }}>
            <HeaderFilterContainer>
                <FilterListIcon />

                <Typography variant="body1">{i18n.t("Filters")}</Typography>

                {showCloseButton && (
                    <IconButton className="icon" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                )}
            </HeaderFilterContainer>

            <Divider />

            <ChipFilter
                items={scopes.map(scope => ({ text: scope, value: scope }))}
                label={i18n.t("Scope")}
                onChange={value => onFilterChange(value, "scope")}
                value={scopeValue}
            />

            <ChipFilter
                items={coreCompetenciesItems}
                label={i18n.t("Core competencies")}
                onChange={value => onFilterChange(value, "coreCompetency")}
                value={coreValue}
                mode="multiple"
            />

            <ChipFilter
                items={generateTypesItems(types, indicatorsPerType)}
                label={i18n.t("Type")}
                onChange={value => onFilterChange(value, "outputType")}
                value={[selectedType]}
                mode="single"
            />

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
                    items={groups.map(g => ({ text: g, value: g }))}
                    onChange={value =>
                        onFilterChange([{ text: value ?? "", value: value ?? "" }], "group")
                    }
                    label={i18n.t("Group")}
                    value={group}
                />
            </BodyFilterContainer>
        </FilterIndicatorContainer>
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

export type ChipFilterProps = {
    items: ChipItem[];
    label: string;
    onChange: (item: ChipItem[]) => void;
    value: string[];
    mode?: "single" | "multiple";
};

export type ChipItem = { text: string; value: string };

export const ChipFilter = React.memo((props: ChipFilterProps) => {
    const { items, label, onChange, value: selectedValues, mode = "single" } = props;

    const handleChipClick = (itemValue: string) => {
        const currentItem = items.find(item => item.value === itemValue);

        if (!currentItem) return;

        if (mode === "single") {
            onChange([currentItem]);
        } else {
            const isSelected = selectedValues.includes(itemValue);
            const updatedItems = isSelected
                ? selectedValues
                      .filter(
                          value => value !== itemValue && items.find(item => item.value === value)
                      )
                      .map(value => ({ text: value, value }))
                : [...selectedValues, itemValue]
                      .filter(value => items.find(item => item.value === value))
                      .map(value => ({ text: value, value }));

            onChange(updatedItems);
        }
    };

    const isSelected = (itemValue: string) => selectedValues.includes(itemValue);

    return (
        <BodyFilterContainer>
            <Typography variant="body1">
                <strong>{label}</strong>
            </Typography>
            <ScopeContainer>
                {items.map(item => (
                    <Chip
                        key={item.value}
                        color={isSelected(item.value) ? "primary" : "default"}
                        label={item.text}
                        onClick={() => handleChipClick(item.value)}
                        variant="default"
                    />
                ))}
            </ScopeContainer>
        </BodyFilterContainer>
    );
});

const FilterIndicatorContainer = styled.div`
    max-width: 350px;
    display: flex;
    flex-direction: column;
    row-gap: 0.5em;
`;

const HeaderFilterContainer = styled.div`
    align-items: center;
    display: flex;
    gap: 0.5em;
    padding-inline: 1em;

    .icon {
        margin-left: auto;
    }
`;

const BodyFilterContainer = styled.div`
    padding-inline: 1em;
`;

const ScopeContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    padding-block: 1em;
`;
