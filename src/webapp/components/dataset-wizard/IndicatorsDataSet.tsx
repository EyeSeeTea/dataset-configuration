import React from "react";
import styled from "styled-components";
import { Alert, ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import {
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    useMediaQuery,
} from "@material-ui/core";
import {
    ObjectsTable,
    SearchBox,
    TableSorting,
    TableState,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { FilterIndicators, FilterType } from "$/webapp/components/dataset-wizard/FilterIndicators";
import { Indicator } from "$/domain/entities/Indicator";
import _ from "$/domain/entities/generic/Collection";
import { Id } from "$/domain/entities/Ref";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { Maybe } from "$/utils/ts-utils";
import { useBooleanState } from "$/webapp/hooks/useBooleanState";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { SnackBarAction } from "$/webapp/components/snack-bar-action/SnackBarAction";
import {
    IndicatorColumn,
    useGetCompanionIndicators,
    useIndicatorsTableColumns,
} from "$/webapp/hooks/useIndicators";
import { useGetMasterLogFrameByCodes } from "$/webapp/hooks/useMasterLogFrame";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import {
    FilterIndicatorsContainer,
    FilterWrapper,
} from "$/webapp/components/dataset-wizard/FilterIndicatorContainer";
import { ChipItem } from "$/webapp/components/dataset-wizard/ChipFilter";
import { FilterCompanionIndicators } from "$/webapp/components/dataset-wizard/FilterCompanionIndicators";
import { useDisable2026bvFA7fsiN3TOnIndicatorUpdate } from "$/webapp/components/dataset-wizard/useDisable2026bvFA7fsiN3T";

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
    const [sorting, setSorting] = React.useState<TableSorting<IndicatorColumn>>({
        field: "status",
        order: "asc",
    });
    const [hasCompanionTable, hasCompanionTableActions] = useBooleanState(false);
    const [search, setSearch] = React.useState<string>("");

    const { selectedCompanionScope, updateCompanionFilter, companionScopes } =
        useCompanionIndicatorFilter(dataSet);

    const companionIndicators = useGetCompanionIndicators({
        indicators,
        selectedIndicators,
        dataSet,
        selectedFilterValue,
        selectedCompanionScope,
    });

    const accessCodes = React.useMemo(() => dataSet.getRegionCodesFromAccess(), [dataSet]);
    const { error: errorMlf, loading, masterLogFrames } = useGetMasterLogFrameByCodes(accessCodes);

    const currentMlf = React.useMemo(() => {
        return masterLogFrames.find(mlf => mlf.id === selectedMLF);
    }, [masterLogFrames, selectedMLF]);

    const { allMeasures, allThemes, filteredRows } = useFilterIndicators({
        search,
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
        onShowCompanionIndicator: React.useCallback(() => {
            hasCompanionTableActions.enable();
            setSearch("");
        }, [hasCompanionTableActions]),
        companionTable: hasCompanionTable,
    });

    const columns = useIndicatorsTableColumns({
        showCompanionColumn: hasCompanionTable,
        statusIndicator: indicator => <StatusIndicator status={indicator.status} />,
    });

    const openFilters = React.useCallback(() => setShowFilterModal(true), []);

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

    const toggleCompanionTable = React.useCallback(() => {
        setSearch("");
        hasCompanionTableActions.toggle();
    }, [hasCompanionTableActions]);

    return (
        <form>
            <Grid container spacing={1}>
                <FilterWrapper
                    mode={isLargeDesktop ? "default" : "drawer"}
                    showDrawer={showFilterModal}
                    onClose={() => setShowFilterModal(false)}
                >
                    <>
                        <SuggestCompanionContainer>
                            <Button
                                variant={"contained"}
                                color="primary"
                                fullWidth
                                onClick={toggleCompanionTable}
                                disabled={companionIndicators.length === 0}
                            >
                                {hasCompanionTable
                                    ? i18n.t("Hide Suggested Companion Indicators")
                                    : i18n.t("Show Suggested Companion Indicators")}
                            </Button>
                        </SuggestCompanionContainer>
                        <FilterIndicatorsContainer
                            showCloseButton={!isLargeDesktop}
                            onClose={() => setShowFilterModal(false)}
                            hideFilter={hasCompanionTable}
                        >
                            <FilterIndicators
                                measures={allMeasures}
                                measure={selectedMeasure}
                                scopes={scopes}
                                scopeValue={[scope]}
                                onFilterChange={updateFilter}
                                coreCompetencies={coreCompetencies}
                                coreValues={selectedCompetencies}
                                types={types}
                                selectedType={selectedType}
                                themes={allThemes}
                                theme={selectedTheme}
                                indicatorsPerCompetency={indicatorsPerCompetency}
                                indicatorsPerType={indicatorsPerType}
                                hidden={hasCompanionTable}
                                masterLogFrames={{
                                    data: masterLogFrames,
                                    loading,
                                    error: errorMlf,
                                    value: selectedMLF,
                                }}
                            />
                            <FilterCompanionIndicators
                                onFilterChange={updateCompanionFilter}
                                scopes={companionScopes}
                                scopeValue={selectedCompanionScope}
                                hidden={!hasCompanionTable}
                            />
                        </FilterIndicatorsContainer>
                    </>
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
                        rows={hasCompanionTable ? companionIndicators : filteredRows}
                        forceSelectionColumn
                        filterComponents={
                            <FilterTable
                                onSearchChange={setSearch}
                                onChange={setSelectedFilterValue}
                                search={search}
                            />
                        }
                        selection={dataSet.indicators.map(indicator => ({ id: indicator.id }))}
                        onChange={validateIndicators}
                        sorting={sorting}
                        globalActionComponents={
                            <SectionConfig dataSet={dataSet} onChange={onChange} />
                        }
                    />
                </Grid>
            </Grid>
        </form>
    );
});

export const FilterTable = React.memo(
    (props: {
        onChange: (value: Maybe<SelectedFilterValue>) => void;
        onSearchChange: (search: string) => void;
        search: string;
    }) => {
        const { onChange, onSearchChange, search } = props;
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
                <SearchBox
                    onChange={onSearchChange}
                    hintText={i18n.t("Search by name")}
                    className="search-box-indicators"
                    value={search}
                />
                <section>
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
                </section>
            </>
        );
    }
);

const SectionConfig = React.memo(
    (props: { dataSet: DataSet; onChange: (dataSet: DataSet) => void }) => {
        const { dataSet, onChange } = props;
        return (
            <SectionConfigContainer>
                <Divider />
                <FormControlLabel
                    control={
                        <CheckboxSectionConfig
                            checked={dataSet.sectionConfig.renderAsTabs}
                            onChange={event =>
                                onChange(
                                    dataSet.setSectionConfig("renderAsTabs", event.target.checked)
                                )
                            }
                        />
                    }
                    label={i18n.t("Group data element in sections")}
                />
                <Divider />
                <FormControlLabel
                    control={
                        <CheckboxSectionConfig
                            checked={dataSet.sectionConfig.showRowTotals}
                            onChange={event =>
                                onChange(
                                    dataSet.setSectionConfig("showRowTotals", event.target.checked)
                                )
                            }
                        />
                    }
                    label={i18n.t("Show row totals")}
                />

                <FormControlLabel
                    control={
                        <CheckboxSectionConfig
                            checked={dataSet.sectionConfig.showColumnTotals}
                            onChange={event =>
                                onChange(
                                    dataSet.setSectionConfig(
                                        "showColumnTotals",
                                        event.target.checked
                                    )
                                )
                            }
                        />
                    }
                    label={i18n.t("Show column totals")}
                />
            </SectionConfigContainer>
        );
    }
);

function useFilterIndicators(props: {
    search: string;
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
        search,
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
                if (search.length === 0) return true;
                const name = indicator.name.toLowerCase();
                return name.includes(search.toLowerCase());
            })
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
        search,
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
    setSorting: React.Dispatch<React.SetStateAction<TableSorting<IndicatorColumn>>>;
    onShowCompanionIndicator: () => void;
    companionTable: boolean;
}) {
    const [alertedIndicatorIds, setAlertedIndicatorIds] = React.useState<Set<Id>>(new Set());
    const snackBar = useSnackbar();

    const {
        companionTable,
        indicators,
        onChange,
        dataSet,
        onShowCompanionIndicator,
        setSelectedIndicators,
        setSorting,
    } = props;

    const { disable2026bvFA7fsiN3T } = useDisable2026bvFA7fsiN3TOnIndicatorUpdate();

    const indicatorsById = React.useMemo(
        () => _(indicators).keyBy(indicator => indicator.id),
        [indicators]
    );

    const validateIndicators = React.useCallback(
        (state: TableState<IndicatorColumn>) => {
            const ids = state.selection.map(row => row.id);

            const { showAlert, newIndicatorIdsToAlert } = getAlertedIndicatorIds(
                alertedIndicatorIds,
                ids,
                indicatorsById
            );

            if (showAlert && !companionTable) {
                snackBar.info(
                    <SnackBarAction
                        message={i18n.t("There are some suggested companion")}
                        buttonText={i18n.t("Show them")}
                        onClick={onShowCompanionIndicator}
                    />,
                    { autoHideDuration: 6000 }
                );
            }

            const currentIndicators = _(ids)
                .compactMap(indicatorId => {
                    const indicatorInfo = indicatorsById.get(indicatorId);
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

            setAlertedIndicatorIds(newIndicatorIdsToAlert);
            setSelectedIndicators(ids);

            const dataSetIndicators = dataSet.setIndicators(currentIndicators);
            disable2026bvFA7fsiN3T({
                indicators: currentIndicators,
                dataSet: dataSetIndicators,
            }).run(
                updatedDataSet => onChange(updatedDataSet),
                () => onChange(dataSetIndicators)
            );
            setSorting(state.sorting);
        },
        [
            companionTable,
            dataSet,
            alertedIndicatorIds,
            indicatorsById,
            onChange,
            setSelectedIndicators,
            setSorting,
            snackBar,
            onShowCompanionIndicator,
            disable2026bvFA7fsiN3T,
        ]
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

function getAlertedIndicatorIds(
    existingIndicatorsAlerted: Set<Id>,
    ids: Id[],
    indicatorsById: HashMap<Id, Indicator>
) {
    const unAlertedIds = ids.filter(id => !existingIndicatorsAlerted.has(id));
    const showAlert = unAlertedIds
        .map(id => indicatorsById.get(id))
        .some(row => {
            if (!row) return false;
            return thereAreCompanionIndicators(row);
        });

    const newIndicatorIdsToAlert = new Set([
        ...ids.filter(id => {
            const indicator = indicatorsById.get(id);
            if (!indicator) return false;
            return thereAreCompanionIndicators(indicator);
        }),
    ]);

    return { showAlert, newIndicatorIdsToAlert };
}

function useCompanionIndicatorFilter(dataSet: DataSet) {
    const [selectedCompanionScope, setSelectedCompanionScope] = React.useState<string[]>([]);

    const companionScopes = React.useMemo(() => {
        const companionScopes = dataSet.indicators.flatMap(indicator =>
            indicator.getCompanionScopes()
        );
        return _(companionScopes)
            .uniq()
            .sort()
            .map(scope => ({ text: scope, value: scope }))
            .value();
    }, [dataSet]);

    const updateCompanionFilter = React.useCallback((value: ChipItem[]) => {
        const selectedValues = value.map(item => item.value);
        setSelectedCompanionScope(selectedValues);
    }, []);

    return {
        companionScopes,
        selectedCompanionScope,
        updateCompanionFilter,
    };
}

function thereAreCompanionIndicators(indicator: Indicator): boolean {
    return indicator.getAllCompanionCodesFromRules().length > 0;
}

const selectedFilterValues = ["selected", "non-selected"] as const;

export type SelectedFilterValue = (typeof selectedFilterValues)[number];
export type IndicatorPerItem = { id: Id; totalIndicators: number };

const ToggleButtonStyled = styled(ToggleButton)`
    backgroundcolor: none;
    border: none !important;
`;

const SuggestCompanionContainer = styled.div`
    padding: 0.5em !important;
`;

const SectionConfigContainer = styled(Box)`
    padding-block-start: 0.5em;
    padding-block-end: 0;
    padding-inline: 1.5em;
    display: flex;
    flex-direction: column;
    min-width: 270px;
`;

const CheckboxSectionConfig = styled(Checkbox)`
    margin-block: 8px !important;
    margin-inline: 0 !important;
`;
