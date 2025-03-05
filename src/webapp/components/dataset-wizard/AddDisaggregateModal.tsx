import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@material-ui/core";
import { DataSet } from "$/domain/entities/DataSet";
import { Dropdown, MultipleDropdown } from "@eyeseetea/d2-ui-components";
import i18n from "$/utils/i18n";
import { IndicatorWithDataElement } from "$/domain/entities/Indicator";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { Maybe, UnionFromValues } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";

type AddDisaggregateModalProps = {
    combinations: CategoryCombination[];
    dataSet: DataSet;
    indicator: IndicatorWithDataElement;
    onClose: () => void;
    onSave: (response: { categoriesIds: Id[]; mode: AddDisaggregateMode }) => void;
};

function getSelectedCategoriesByIndicator(indicator: IndicatorWithDataElement): Id[] {
    const firstDataElement = indicator.dataElements[0];
    if (!firstDataElement) return [];
    return _(firstDataElement.categories)
        .map(category => category.id)
        .uniq()
        .sort()
        .value();
}

export const AddDisaggregateModal = React.memo((props: AddDisaggregateModalProps) => {
    const { combinations, indicator, onClose, onSave } = props;
    const [categoriesIds, setCategoriesIds] = React.useState<Id[]>(
        getSelectedCategoriesByIndicator(indicator)
    );
    const [mode, setMode] = React.useState<AddDisaggregateMode>("indicator");

    const updateMode = (value: Maybe<string>) => {
        const mode = disaggregationModes.find(mode => mode === value);
        setMode(mode || "indicator");
    };

    const categories = CategoryCombination.buildUniqueCategories(combinations, indicator).map(
        category => ({
            text: category.name,
            value: category.id,
        })
    );

    const modes = disaggregationModes.map(mode => ({ text: mode, value: mode }));

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

    return (
        <Dialog open maxWidth="lg">
            <DialogTitle>
                {i18n.t("Add disaggregate")}
                <div style={{ maxWidth: "600px" }}>
                    {indicator.dataElements.map(dataElement => {
                        return <p key={dataElement.id}>{dataElement.name}</p>;
                    })}
                </div>
            </DialogTitle>
            <DialogContent>
                <div className="dropdown-disaggregates">
                    <MultipleDropdown
                        items={categories}
                        label={i18n.t("Add disaggregate")}
                        onChange={onUpdateCategoriesIds}
                        values={categoriesIds}
                        className="dropdown"
                    />
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

const disaggregationModes = ["indicator", "competency", "all"];
export type AddDisaggregateMode = UnionFromValues<typeof disaggregationModes>;
