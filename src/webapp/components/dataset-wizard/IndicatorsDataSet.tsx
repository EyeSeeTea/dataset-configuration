import React from "react";
import { Button, Divider, Grid, useMediaQuery } from "@material-ui/core";
import { Alert, ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import {
    ObjectsTable,
    ObjectsTableProps,
    TableSorting,
    TableState,
} from "@eyeseetea/d2-ui-components";

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
import { Maybe } from "$/utils/ts-utils";
import styled from "styled-components";
import { useGetMasterLogFrameByCodes } from "$/webapp/hooks/useMasterLogFrame";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";

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

const scopes = [
    { text: "Global Mandatory", value: "mandatory" },
    { text: "Global Suggested", value: "suggested" },
    { text: "Donor", value: "donor" },
    { text: "Local", value: "local" },
];

const types = ["Outputs", "Outcomes"];

export const IndicatorsDataSet = React.memo((props: IndicatorsDataSetProps) => {
    const { dataSet, dataSetSettings, onChange } = props;
    const { coreCompetencies, indicators } = dataSetSettings;
    const [showFilterModal, setShowFilterModal] = React.useState(false);
    const [scope, setScope] = React.useState("mandatory");
    const [selectedCompetencies, setCore] = React.useState<string[]>(
        _(dataSet.indicators)
            .map(indicator => indicator.coreCompetency.id)
            .uniq()
            .value()
    );
    const [selectedType, setType] = React.useState("Outputs");
    const [selectedTheme, setTheme] = React.useState("");
    const [selectedMeasure, setMeasure] = React.useState("");
    const [selectedFilterValue, setSelectedFilterValue] = React.useState<SelectedFilterValue>();
    const [selectedIndicators, setSelectedIndicators] = React.useState<Id[]>(
        dataSet.indicators.map(indicator => indicator.id)
    );
    const [selectedMLF, setSelectedMLF] = React.useState<string>("");
    const isLargeDesktop = useMediaQuery("(min-width: 1320px)");
    const [sorting, setSorting] = React.useState<TableSorting<Indicator>>({
        field: "status",
        order: "asc",
    });

    const accessCodes = React.useMemo(() => dataSet.getRegionCodesFromAccess(), [dataSet]);
    const { error: errorMlf, loading, masterLogFrames } = useGetMasterLogFrameByCodes(accessCodes);

    const currentMlf = React.useMemo(() => {
        return masterLogFrames.find(mlf => mlf.id === selectedMLF);
    }, [masterLogFrames, selectedMLF]);

    const { allMeasures, allThemes, filteredRows } = useFilterIndicators({
        indicators,
        scope,
        selectedType,
        selectedCompetencies,
        selectedTheme,
        selectedFilterValue,
        selectedIndicators,
        selectedMeasure,
        selectedMlf: currentMlf,
    });

    const validateIndicators = useValidateIndicators({
        dataSet,
        indicators,
        onChange,
        setSelectedIndicators,
        setSorting,
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

    const updateFilter = React.useCallback((value: ChipItem[], filterType: FilterType) => {
        const singleItemValue = value[0]?.value || "";
        switch (filterType) {
            case "scope":
                setScope(singleItemValue);
                break;
            case "coreCompetency":
                setCore(value.map(v => v.value));
                break;
            case "outputType":
                setType(singleItemValue);
                setSelectedMLF("");
                break;
            case "theme":
                setTheme(singleItemValue);
                break;
            case "measure":
                setMeasure(singleItemValue);
                break;
            case "MLF":
                setSelectedMLF(singleItemValue);
                break;
        }
    }, []);

    const activeFilters = React.useMemo(() => {
        const competencies = _(selectedCompetencies)
            .compactMap(selectedCompetency => {
                const coreCompetency = coreCompetencies.find(
                    coreCompetency => coreCompetency.id === selectedCompetency
                );
                return coreCompetency?.name;
            })
            .join(", ");

        const selectedMLFName = masterLogFrames.find(mlf => mlf.id === selectedMLF)?.name ?? "";

        return _([scope, selectedType, competencies, selectedTheme, selectedMLFName])
            .filter(item => item.length > 0)
            .join(", ");
    }, [
        coreCompetencies,
        scope,
        selectedCompetencies,
        selectedType,
        selectedTheme,
        masterLogFrames,
        selectedMLF,
    ]);

    const indicatorsPerCompetency = useBuildTotalByKey(
        dataSet.indicators,
        indicator => indicator.coreCompetency.id
    );

    const indicatorsPerType = useBuildTotalByKey(dataSet.indicators, indicator => indicator.type);

    return (
        <form>
            <Grid container spacing={1}>
                <FilterWrapper
                    mode={isLargeDesktop ? "default" : "drawer"}
                    showDrawer={showFilterModal}
                >
                    <FilterIndicators
                        measures={allMeasures}
                        measure={selectedMeasure}
                        scopes={scopes}
                        scopeValue={[scope]}
                        onFilterChange={updateFilter}
                        coreCompetencies={coreCompetencies}
                        showCloseButton={!isLargeDesktop}
                        coreValues={selectedCompetencies}
                        types={types}
                        selectedType={selectedType}
                        themes={allThemes}
                        theme={selectedTheme}
                        onClose={() => setShowFilterModal(false)}
                        indicatorsPerCompetency={indicatorsPerCompetency}
                        indicatorsPerType={indicatorsPerType}
                        masterLogFrames={{
                            data: masterLogFrames,
                            loading,
                            error: errorMlf,
                            value: selectedMLF,
                        }}
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
                        filterComponents={<FilterTable onChange={setSelectedFilterValue} />}
                        selection={dataSet.indicators.map(indicator => ({ id: indicator.id }))}
                        searchBoxLabel={i18n.t("Search by name")}
                        searchBoxColumns={["name"]}
                        onChange={validateIndicators}
                        sorting={sorting}
                    />
                </Grid>
            </Grid>
        </form>
    );
});

export const FilterTable = React.memo(
    (props: { onChange: (value: Maybe<SelectedFilterValue>) => void }) => {
        const { onChange } = props;
        const [value, setValue] = React.useState<SelectedFilterValue>();

        const handleAlignment = (
            _event: React.MouseEvent<HTMLElement>,
            newValue: Maybe<string>
        ) => {
            const selectedValue = selectedFilterValues.find(value => value === newValue);
            setValue(selectedValue);
            onChange(selectedValue);
        };

        return (
            <>
                <ToggleButtonGroup exclusive value={value} onChange={handleAlignment}>
                    <ToggleButtonStyled value="selected">
                        <Button
                            variant={value === "selected" ? "outlined" : "text"}
                            color="primary"
                        >
                            {i18n.t("Selected")}
                        </Button>
                    </ToggleButtonStyled>
                    <ToggleButtonStyled value="non-selected">
                        <Button
                            variant={value === "non-selected" ? "outlined" : "text"}
                            color="primary"
                        >
                            {i18n.t("No Selected")}
                        </Button>
                    </ToggleButtonStyled>
                </ToggleButtonGroup>
            </>
        );
    }
);

function useFilterIndicators(props: {
    indicators: Indicator[];
    scope: string;
    selectedMeasure: string;
    selectedType: string;
    selectedCompetencies: string[];
    selectedTheme: string;
    selectedFilterValue: Maybe<SelectedFilterValue>;
    selectedIndicators: Id[];
    selectedMlf: Maybe<MasterLogFrame>;
}) {
    const {
        indicators,
        scope,
        selectedType,
        selectedCompetencies,
        selectedTheme,
        selectedFilterValue,
        selectedIndicators,
        selectedMeasure,
        selectedMlf,
    } = props;

    const indicatorsByMlf = _(selectedMlf?.indicators || []).keyBy(indicator => indicator.id);

    const allThemes = React.useMemo(() => {
        return _(indicators)
            .map(indicator => indicator.theme)
            .uniq()
            .value();
    }, [indicators]);

    const allMeasures = React.useMemo(() => {
        return _(indicators)
            .map(indicator => indicator.measure)
            .uniq()
            .value();
    }, [indicators]);

    const filteredRows = React.useMemo(() => {
        return indicators
            .filter(indicator => {
                if (!selectedFilterValue) return true;
                return selectedFilterValue === "selected"
                    ? selectedIndicators.includes(indicator.id)
                    : !selectedIndicators.includes(indicator.id);
            })
            .filter(indicator => {
                const isInCompetency =
                    selectedCompetencies.length > 0
                        ? selectedCompetencies.includes(indicator.coreCompetency.id)
                        : true;

                const isInTheme = selectedTheme ? indicator.theme === selectedTheme : true;
                const isInMeasure = selectedMeasure ? indicator.measure === selectedMeasure : true;
                const isInMLF = selectedMlf ? Boolean(indicatorsByMlf.get(indicator.id)?.id) : true;

                return (
                    isInMLF &&
                    isInMeasure &&
                    isInTheme &&
                    isInCompetency &&
                    indicator.scope.toLowerCase() === scope.toLowerCase() &&
                    indicator.type.toLowerCase() === selectedType.toLowerCase()
                );
            })
            .sort((a, b) => {
                return a.status.localeCompare(b.status);
            });
    }, [
        selectedCompetencies,
        selectedTheme,
        indicators,
        scope,
        selectedType,
        selectedFilterValue,
        selectedIndicators,
        selectedMeasure,
        selectedMlf,
        indicatorsByMlf,
    ]);

    return { allMeasures, allThemes, filteredRows };
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

function useValidateIndicators(props: {
    indicators: Indicator[];
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    setSelectedIndicators: React.Dispatch<React.SetStateAction<Id[]>>;
    setSorting: React.Dispatch<React.SetStateAction<TableSorting<Indicator>>>;
}) {
    const { indicators, onChange, dataSet, setSelectedIndicators, setSorting } = props;

    const validateIndicators = React.useCallback(
        (state: TableState<Indicator>) => {
            const ids = state.selection.map(row => row.id);
            const currentIndicators = _(ids)
                .compactMap(indicatorId => {
                    const indicatorInfo = indicators.find(
                        indicator => indicator.id === indicatorId
                    );
                    if (!indicatorInfo) return undefined;
                    const updatedIndicator = dataSet.indicators.find(
                        indicator => indicator.id === indicatorId
                    );
                    return Indicator.create({
                        ...indicatorInfo,
                        disaggregation:
                            updatedIndicator?.disaggregation || indicatorInfo.disaggregation,
                        categories: updatedIndicator?.categories || indicatorInfo.categories,
                        relatedDataElements:
                            updatedIndicator?.relatedDataElements ||
                            indicatorInfo.relatedDataElements,
                    });
                })
                .value();
            setSelectedIndicators(ids);
            onChange(dataSet.setIndicators(currentIndicators));
            setSorting(state.sorting);
        },
        [dataSet, indicators, onChange, setSelectedIndicators, setSorting]
    );
    return validateIndicators;
}

function useBuildTotalByKey(
    indicators: Indicator[],
    getKey: (indicator: Indicator) => string
): IndicatorPerItem[] {
    return React.useMemo(() => {
        return _(indicators)
            .groupBy(getKey)
            .mapValues(([key, group]) => ({ id: key, totalIndicators: group.length }))
            .values();
    }, [indicators, getKey]);
}

const selectedFilterValues = ["selected", "non-selected"] as const;

export type SelectedFilterValue = (typeof selectedFilterValues)[number];

export type IndicatorPerItem = { id: Id; totalIndicators: number };

const ToggleButtonStyled = styled(ToggleButton)`
    backgroundcolor: none;
    border: none !important;
`;
