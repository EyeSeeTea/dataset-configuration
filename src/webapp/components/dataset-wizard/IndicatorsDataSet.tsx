import React from "react";
import { Button, Divider, Grid, useMediaQuery } from "@material-ui/core";
import { ObjectsTable, useObjectsTable } from "@eyeseetea/d2-ui-components";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import {
    FilterIndicators,
    FilterType,
    FilterWrapper,
} from "$/webapp/components/dataset-wizard/FilterIndicators";

export type IndicatorsDataSetProps = { dataSet?: DataSet };

export type IndicatorsColumns = {
    id: string;
    name: string;
    theme: string;
    group: string;
    status: string;
    disaggregation: string;
};

export const IndicatorsDataSet = React.memo(() => {
    const [showFilterModal, setShowFilterModal] = React.useState(false);
    const [scope, setScope] = React.useState("Core");
    const [core, setCore] = React.useState("Icla");
    const isLargeDesktop = useMediaQuery("(min-width: 1320px)");
    const tableConfig = useObjectsTable<IndicatorsColumns>(
        React.useMemo(() => {
            return {
                columns: [
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
                    },
                    {
                        name: "disaggregation",
                        text: i18n.t("Disaggregation"),
                    },
                ],
                actions: [],
                initialSorting: { field: "name", order: "asc" },
                paginationOptions: { pageSizeInitialValue: 50, pageSizeOptions: [50, 100, 200] },
                searchBoxLabel: i18n.t("Search"),
            };
        }, []),
        React.useCallback(() => {
            return Promise.resolve({
                objects: [],
                pager: { page: 1, pageCount: 1, total: 1, pageSize: 1 },
            });
        }, [])
    );

    const openFilters = React.useCallback(() => {
        setShowFilterModal(true);
    }, []);

    const updateFilter = React.useCallback((value: string, filterType: FilterType) => {
        if (filterType === "scope") {
            setScope(value);
        } else if (filterType === "core") {
            setCore(value);
        }
    }, []);

    return (
        <form>
            <Grid container spacing={1}>
                <FilterWrapper
                    mode={isLargeDesktop ? "default" : "drawer"}
                    showDrawer={showFilterModal}
                >
                    <FilterIndicators
                        scopes={["Core", "Donor", "Local"]}
                        scopeValue={scope}
                        onFilterChange={updateFilter}
                        coreCompetencies={[
                            "Education",
                            "Icla",
                            "Livelihood & Food Security Themes",
                            "Protection from vehicle",
                            "Other",
                            "Wash",
                        ]}
                        showCloseButton={!isLargeDesktop}
                        coreValue={core}
                        types={["Outputs", "Outcomes"]}
                        themes={[]}
                        groups={[]}
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
                            {i18n.t("Active Filters")}: {scope}, {core}
                        </Grid>
                    </Grid>

                    <ObjectsTable {...tableConfig} filterComponents={<FilterTable />} />
                </Grid>
            </Grid>
        </form>
    );
});

export const FilterTable = React.memo(() => {
    const [value, setValue] = React.useState(1);
    return (
        <div>
            <Button
                onClick={() => setValue(1)}
                variant={value === 1 ? "outlined" : "text"}
                color="primary"
            >
                {i18n.t("Selected")}
            </Button>
            <Button
                onClick={() => setValue(2)}
                variant={value === 2 ? "outlined" : "text"}
                color="primary"
            >
                {i18n.t("No Selected")}
            </Button>
        </div>
    );
});
