import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from "@material-ui/core";
import { DataSet } from "$/domain/entities/DataSet";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import i18n from "$/utils/i18n";
import { Indicator, IndicatorWithDataElement } from "$/domain/entities/Indicator";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";
import styled from "styled-components";

type AddDisaggregateModalProps = {
    combinations: CategoryCombination[];
    dataSet: DataSet;
    indicator: IndicatorWithDataElement;
    originalIndicators: Indicator[];
    onClose: () => void;
    onSave: (response: { categoriesIds: Id[]; mode: AddDisaggregateMode }) => void;
};

function getInitialIndicatorData(id: Id, indicators: Indicator[]): Maybe<Indicator> {
    return indicators.find(indicator => indicator.id === id);
}

function getSelectedCategoriesByIndicator(indicator: IndicatorWithDataElement): Id[] {
    const firstDataElement = indicator.dataElements[0];
    return _(firstDataElement?.categories ?? [])
        .map(category => category.id)
        .uniq()
        .sort()
        .value();
}

export const AddDisaggregateModal = React.memo((props: AddDisaggregateModalProps) => {
    const { combinations, indicator, onClose, originalIndicators, onSave } = props;
    const initialIndicatorData = getInitialIndicatorData(
        indicator.indicator.id,
        originalIndicators
    );
    const [showButton, setShowButton] = React.useState(false);
    const [categoriesIds, setCategoriesIds] = React.useState<Id[]>(
        getSelectedCategoriesByIndicator(indicator)
    );

    const [mode, setMode] = React.useState<AddDisaggregateMode>("indicator");

    const updateMode = (value: Maybe<string>) => {
        const mode = getDisaggregationModes().find(mode => mode.value === value);
        setMode(mode?.value || "indicator");
    };

    const categories = CategoryCombination.excludeCombinationFromIndicator(
        combinations,
        initialIndicatorData?.disaggregation
    ).map(category => ({
        text: category.name,
        value: category.id,
    }));

    const modes = getDisaggregationModes().map(mode => ({ text: mode.text, value: mode.value }));

    const onUpdateCategoriesIds = (categoriesIds: Id[]) => {
        const selectedCategories = categories.filter(category =>
            categoriesIds.includes(category.value)
        );
        const sortedCategoriesIds = _(selectedCategories)
            .map(category => category.value)
            .sort()
            .value();
        setCategoriesIds(sortedCategoriesIds);
    };

    const editDisaggregateLabel = i18n.t("Edit disaggregate");

    return (
        <Dialog open fullWidth>
            <DialogTitle>
                {editDisaggregateLabel}
                <div style={{ maxWidth: "600px" }}>
                    {indicator.dataElements.map(dataElement => {
                        return <p key={dataElement.id}>{dataElement.name}</p>;
                    })}
                </div>
            </DialogTitle>
            <DialogContent>
                <div className="dropdown-disaggregates">
                    <Typography>
                        {i18n.t("Current Disaggregation")}:{" "}
                        <strong>{initialIndicatorData?.disaggregation?.name ?? ""}</strong>
                    </Typography>

                    <FormControl>
                        <InputLabel>{editDisaggregateLabel}</InputLabel>
                        <Select
                            label={editDisaggregateLabel}
                            placeholder={editDisaggregateLabel}
                            multiple
                            value={categoriesIds}
                            onChange={event => onUpdateCategoriesIds(event.target.value as Id[])}
                            open={showButton}
                            onClose={() => setShowButton(false)}
                            onOpen={() => setShowButton(true)}
                        >
                            <StickyCloseButton>
                                <Button
                                    onClick={() => setShowButton(false)}
                                    color="primary"
                                    variant="contained"
                                >
                                    {i18n.t("Close")}
                                </Button>
                            </StickyCloseButton>
                            {categories.map(category => (
                                <MenuItem key={category.value} value={category.value}>
                                    {category.text}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Dropdown
                        items={modes}
                        label={i18n.t("Add to")}
                        onChange={updateMode}
                        value={mode}
                        className="dropdown"
                        hideEmpty
                    />
                </div>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onSave({ mode, categoriesIds })}
                >
                    {i18n.t("Save")}
                </Button>
                <Button variant="outlined" onClick={() => onClose()}>
                    {i18n.t("Cancel")}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

function getDisaggregationModes() {
    return [
        {
            value: "indicator",
            text: i18n.t("Indicator"),
        },
        {
            value: "competency",
            text: i18n.t("Competency"),
        },
        {
            value: "all",
            text: i18n.t("All"),
        },
        {
            value: "individuals",
            text: i18n.t("All individuals in the data set"),
        },
        {
            value: "households",
            text: i18n.t("All HHS in the data set"),
        },
    ] as const;
}

const disaggregationModes = getDisaggregationModes();

export type AddDisaggregateMode = (typeof disaggregationModes)[number]["value"];

const StickyCloseButton = styled.div`
    position: sticky;
    padding-inline-end: 1em;
    top: 0.5em;
    z-index: 1;
    text-align: right;
`;
