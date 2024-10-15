import React from "react";
import styled from "styled-components";
import { Chip, Divider, Drawer, Grid, IconButton, Typography } from "@material-ui/core";

import FilterListIcon from "@material-ui/icons/FilterList";
import CloseIcon from "@material-ui/icons/Close";
import i18n from "$/utils/i18n";
import { Dropdown } from "@eyeseetea/d2-ui-components";

export type FilterType = "scope" | "core" | "outputType";

export type FilterIndicatorsProps = {
    coreCompetencies: string[];
    coreValue: string;
    groups: string[];
    onClose: () => void;
    onFilterChange: (scope: string, type: FilterType) => void;
    scopes: string[];
    scopeValue: string;
    showCloseButton?: boolean;
    themes: string[];
    types: string[];
};

export type FilterWrapperProps = {
    mode: FilterMode;
    children: React.JSX.Element;
    showDrawer: boolean;
};
export type FilterMode = "default" | "drawer";

export const FilterWrapper = React.memo((props: FilterWrapperProps) => {
    const { children, mode, showDrawer } = props;
    const Wrapper = mode === "default" ? Grid : Drawer;
    return (
        <Wrapper item lg={3} open={showDrawer}>
            {children}
        </Wrapper>
    );
});

export const FilterIndicators = React.memo((props: FilterIndicatorsProps) => {
    const {
        coreCompetencies,
        coreValue,
        onClose,
        onFilterChange,
        scopes,
        scopeValue,
        showCloseButton,
        types,
    } = props;
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
                items={scopes}
                label={i18n.t("Scope")}
                onChange={value => onFilterChange(value, "scope")}
                value={scopeValue}
            />
            <ChipFilter
                items={coreCompetencies}
                label={i18n.t("Core competencies")}
                onChange={value => onFilterChange(value, "core")}
                value={coreValue}
            />

            <ChipFilter
                items={types}
                label={i18n.t("Type")}
                onChange={value => onFilterChange(value, "outputType")}
                value={"Outputs"}
            />

            <BodyFilterContainer>
                <Dropdown
                    className="dropdown"
                    items={[]}
                    onChange={() => {}}
                    label={i18n.t("Theme")}
                />
            </BodyFilterContainer>
            <BodyFilterContainer>
                <Dropdown
                    className="dropdown"
                    items={[]}
                    onChange={() => {}}
                    label={i18n.t("Group")}
                />
            </BodyFilterContainer>
        </FilterIndicatorContainer>
    );
});

export type ChipFilterProps = {
    items: string[];
    label: string;
    onChange: (value: string) => void;
    value: string;
};

export const ChipFilter = React.memo((props: ChipFilterProps) => {
    const { items, label, onChange, value } = props;
    return (
        <BodyFilterContainer>
            <Typography variant="body1">
                <strong>{label}</strong>
            </Typography>
            <ScopeContainer>
                {items.map(item => {
                    return (
                        <Chip
                            key={item}
                            color={item === value ? "primary" : "default"}
                            variant="default"
                            label={item}
                            onClick={() => onChange(item)}
                        />
                    );
                })}
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
