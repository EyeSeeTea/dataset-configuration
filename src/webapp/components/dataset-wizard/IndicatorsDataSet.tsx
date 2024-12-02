import React from "react";
import { Button, Divider, Grid, useMediaQuery } from "@material-ui/core";
import { ObjectsTable, ObjectsTableProps, TableState } from "@eyeseetea/d2-ui-components";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import {
    ChipItem,
    FilterIndicators,
    FilterType,
    FilterWrapper,
} from "$/webapp/components/dataset-wizard/FilterIndicators";
import { Indicator } from "$/domain/entities/Indicator";
import _ from "$/domain/entities/generic/Collection";
import { Id } from "$/domain/entities/Ref";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { Alert } from "@material-ui/lab";

export type IndicatorsDataSetProps = {
    dataSet: DataSet;
    dataSetSettings: DataSetSettings;
    onChange: (dataSet: DataSet) => void;
};

export type IndicatorsColumns = {
    id: string;
    name: string;
    theme: string;
    group: string;
    status: string;
    disaggregation: string;
};

const scopes = ["Core", "Donor", "Local"];
const types = ["Outputs", "Outcomes"];

export const IndicatorsDataSet = React.memo((props: IndicatorsDataSetProps) => {
    const { dataSet, dataSetSettings, onChange } = props;
    const { coreCompetencies, indicators } = dataSetSettings;
    const [showFilterModal, setShowFilterModal] = React.useState(false);
    const [scope, setScope] = React.useState("Core");
    const [selectedCompetencies, setCore] = React.useState<string[]>(
        _(dataSet.indicators)
            .map(indicator => indicator.coreCompetency.id)
            .uniq()
            .value()
    );
    const [selectedType, setType] = React.useState("Outputs");
    const [selectedGroup, setGroup] = React.useState("");
    const [selectedTheme, setTheme] = React.useState("");
    const [onlySelected, setOnlySelected] = React.useState(false);
    const [selectedIndicators, setSelectedIndicators] = React.useState<Id[]>(
        dataSet.indicators.map(indicator => indicator.id)
    );
    const isLargeDesktop = useMediaQuery("(min-width: 1320px)");

    const { allGroups, allThemes, filteredRows } = useFilterIndicators({
        indicators,
        scope,
        selectedType,
        selectedCompetencies,
        selectedGroup,
        selectedTheme,
        onlySelected,
        selectedIndicators,
    });

    const columns: ObjectsTableProps<Indicator>["columns"] = [
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
            getValue: indicator => <StatusIndicator status={indicator.status} />,
        },
        {
            name: "disaggregation",
            text: i18n.t("Disaggregation"),
        },
    ];

    const openFilters = React.useCallback(() => {
        setShowFilterModal(true);
    }, []);

    const updateFilter = React.useCallback(
        (value: ChipItem | ChipItem[], filterType: FilterType) => {
            const isArray = Array.isArray(value);
            switch (filterType) {
                case "scope":
                    if (!isArray) {
                        setScope(value.value);
                    }
                    break;
                case "core":
                    if (isArray) {
                        setCore(value.map(v => v.value));
                    }
                    break;
                case "outputType":
                    if (!isArray) {
                        setType(value.value);
                    }
                    break;
                case "theme":
                    if (!isArray) {
                        setTheme(value.value);
                    }
                    break;
                case "group":
                    if (!isArray) {
                        setGroup(value.value);
                    }
                    break;
            }
        },
        []
    );

    const activeFilters = React.useMemo(() => {
        const competencies = _(selectedCompetencies)
            .compactMap(selectedCompetency => {
                const coreCompetency = coreCompetencies.find(
                    coreCompetency => coreCompetency.id === selectedCompetency
                );
                return coreCompetency?.name;
            })
            .join(", ");

        return _([scope, selectedType, competencies, selectedGroup, selectedTheme])
            .filter(item => item.length > 0)
            .join(", ");
    }, [coreCompetencies, scope, selectedCompetencies, selectedType, selectedGroup, selectedTheme]);

    const validateIndicators = React.useCallback(
        (state: TableState<Indicator>) => {
            const ids = state.selection.map(row => row.id);
            const currentIndicators = _(ids)
                .compactMap(indicatorId => {
                    return indicators.find(indicator => indicator.id === indicatorId);
                })
                .value();
            setSelectedIndicators(ids);
            onChange(dataSet.setIndicators(currentIndicators));
        },
        [indicators, dataSet, onChange]
    );

    return (
        <form>
            <Grid container spacing={1}>
                <FilterWrapper
                    mode={isLargeDesktop ? "default" : "drawer"}
                    showDrawer={showFilterModal}
                >
                    <FilterIndicators
                        scopes={scopes}
                        scopeValue={scope}
                        onFilterChange={updateFilter}
                        coreCompetencies={coreCompetencies}
                        showCloseButton={!isLargeDesktop}
                        coreValues={selectedCompetencies}
                        types={types}
                        selectedType={selectedType}
                        themes={allThemes}
                        groups={allGroups}
                        group={selectedGroup}
                        theme={selectedTheme}
                        onClose={() => setShowFilterModal(false)}
                    />
                </FilterWrapper>

                <Grid item xs={1} style={{ flex: 0 }}>
                    <Divider orientation="vertical" />
                </Grid>

                <Grid item xs={isLargeDesktop ? 8 : 12}>
                    <Grid container spacing={3} alignItems="center">
                        {!isLargeDesktop && (
                            <Grid item>
                                <Button variant="contained" color="primary" onClick={openFilters}>
                                    {i18n.t("Filters")}
                                </Button>
                            </Grid>
                        )}
                        <Grid item>
                            {i18n.t("Active Filters")}: {activeFilters}
                        </Grid>
                    </Grid>

                    <ObjectsTable
                        columns={columns}
                        rows={filteredRows}
                        forceSelectionColumn
                        filterComponents={<FilterTable onChange={setOnlySelected} />}
                        selection={dataSet.indicators.map(indicator => ({ id: indicator.id }))}
                        searchBoxLabel={i18n.t("Search by name")}
                        searchBoxColumns={["name"]}
                        onChange={validateIndicators}
                    />
                </Grid>
            </Grid>
        </form>
    );
});

export const FilterTable = React.memo((props: { onChange: (isSelected: boolean) => void }) => {
    const { onChange } = props;
    const [value, setValue] = React.useState<"selected" | "non-selected">("non-selected");
    const isSelected = value === "selected";

    const onClick = React.useCallback(
        (value: "selected" | "non-selected") => {
            setValue(value);
            onChange(value === "selected");
        },
        [onChange]
    );

    return (
        <div>
            <Button
                onClick={() => onClick("selected")}
                variant={isSelected ? "outlined" : "text"}
                color="primary"
            >
                {i18n.t("Selected")}
            </Button>
            <Button
                onClick={() => onClick("non-selected")}
                variant={!isSelected ? "outlined" : "text"}
                color="primary"
            >
                {i18n.t("No Selected")}
            </Button>
        </div>
    );
});

function useFilterIndicators(props: {
    indicators: Indicator[];
    scope: string;
    selectedType: string;
    selectedCompetencies: string[];
    selectedGroup: string;
    selectedTheme: string;
    onlySelected: boolean;
    selectedIndicators: Id[];
}) {
    const {
        indicators,
        scope,
        selectedType,
        selectedCompetencies,
        selectedGroup,
        selectedTheme,
        onlySelected,
        selectedIndicators,
    } = props;

    const allThemes = React.useMemo(() => {
        return _(indicators)
            .map(indicator => indicator.theme)
            .uniq()
            .value();
    }, [indicators]);

    const allGroups = React.useMemo(() => {
        return _(indicators)
            .map(indicator => indicator.group)
            .uniq()
            .value();
    }, [indicators]);

    const filteredRows = React.useMemo(() => {
        return indicators.filter(indicator => {
            const isInCompetency =
                selectedCompetencies.length > 0
                    ? selectedCompetencies.includes(indicator.coreCompetency.id)
                    : true;

            const isInGroup = selectedGroup ? indicator.group === selectedGroup : true;
            const isInTheme = selectedTheme ? indicator.theme === selectedTheme : true;
            const showSelected = onlySelected ? selectedIndicators.includes(indicator.id) : true;

            return (
                showSelected &&
                isInGroup &&
                isInTheme &&
                isInCompetency &&
                indicator.scope.toLowerCase() === scope.toLowerCase() &&
                indicator.type.toLowerCase() === selectedType.toLowerCase()
            );
        });
    }, [
        selectedCompetencies,
        selectedGroup,
        selectedTheme,
        indicators,
        scope,
        selectedType,
        onlySelected,
        selectedIndicators,
    ]);

    return { allGroups, allThemes, filteredRows };
}

export const StatusIndicator = React.memo((props: { status: string }) => {
    const { status } = props;
    return status.toLocaleLowerCase() === "phased out" ? (
        <Alert icon={false} severity="error" variant="filled">
            {status}
        </Alert>
    ) : (
        <span>{status}</span>
    );
});
