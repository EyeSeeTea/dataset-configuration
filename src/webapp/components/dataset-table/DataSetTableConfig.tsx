import React from "react";
import { DataSet, DataSetAttrs, DataSetList } from "$/domain/entities/DataSet";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useObjectsTable } from "@eyeseetea/d2-ui-components";
import SharingIcon from "@material-ui/icons/Share";
import EditIcon from "@material-ui/icons/Edit";
import DomainIcon from "@material-ui/icons/Domain";
import DateRangeIcon from "@material-ui/icons/DateRange";
import DetailsIcon from "@material-ui/icons/Details";
import DeleteIcon from "@material-ui/icons/Delete";
import CopyIcon from "@material-ui/icons/FileCopy";
import ListIcon from "@material-ui/icons/List";

import _ from "$/domain/entities/generic/Collection";
import i18n from "$/utils/i18n";
import { TableAction } from "$/webapp/components/dataset-table/DataSetTable";
import { useNavigateTo } from "$/webapp/routes";
import { parseSortField } from "$/utils/parse-sort-field";

export type DataSetColumns = DataSetAttrs & { permissionDescription: string };

export function useTableConfig(props: TableConfigProps) {
    const { onAction, refreshTable } = props;
    const { compositionRoot } = useAppContext();
    const navigateTo = useNavigateTo();

    const tableConfig = useObjectsTable<DataSetList>(
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
                        sortable: true,
                        getValue: dataSet => dataSet.name,
                    },
                    {
                        name: "permissions",
                        text: i18n.t("Access"),
                        sortable: false,
                        getValue: dataSet => DataSet.buildAccess(dataSet.permissions),
                    },
                    {
                        name: "lastUpdated",
                        text: i18n.t("Last updated"),
                        getValue: dataSet => dataSet.lastUpdated,
                    },
                ],
                actions: [
                    {
                        name: "edit",
                        text: i18n.t("Edit"),
                        icon: <EditIcon />,
                        multiple: false,
                        primary: true,
                        onClick(selectedIds) {
                            const dataSetId = _(selectedIds).first();
                            if (!dataSetId) return;
                            navigateTo("editDataSets", { id: dataSetId });
                        },
                    },
                    {
                        name: "sharing",
                        text: i18n.t("Sharing Settings"),
                        icon: <SharingIcon />,
                        multiple: true,
                        onClick(selectedIds) {
                            onAction({ ids: selectedIds, action: "sharing" });
                        },
                    },
                    {
                        name: "assign_orgunits",
                        text: i18n.t("Assign to Organisation Units"),
                        icon: <DomainIcon />,
                        multiple: true,
                        onClick: selectedIds => {
                            onAction({ ids: selectedIds, action: "orgUnits" });
                        },
                    },
                    {
                        name: "set_period_dates",
                        text: i18n.t("Set output/outcome period dates"),
                        icon: <DateRangeIcon />,
                        multiple: true,
                    },
                    {
                        name: "set_end_dates",
                        text: i18n.t("Change output/outcome end date for year"),
                        icon: <DateRangeIcon />,
                        multiple: true,
                    },
                    {
                        name: "show_details",
                        text: i18n.t("Details"),
                        icon: <DetailsIcon />,
                        multiple: false,
                        onClick: selectedIds => {
                            onAction({ ids: selectedIds, action: "details" });
                        },
                    },
                    {
                        name: "clone",
                        text: i18n.t("Clone"),
                        icon: <CopyIcon />,
                        multiple: false,
                    },
                    {
                        name: "delete",
                        text: i18n.t("Delete"),
                        icon: <DeleteIcon />,
                        multiple: true,
                        onClick(selectedIds) {
                            onAction({ ids: selectedIds, action: "remove" });
                        },
                    },
                    {
                        name: "logs",
                        text: i18n.t("Logs"),
                        icon: <ListIcon />,
                        multiple: true,
                        onClick(selectedIds) {
                            onAction({ ids: selectedIds, action: "logs" });
                        },
                    },
                ],
                initialSorting: { field: "name", order: "asc" },
                paginationOptions: { pageSizeInitialValue: 50, pageSizeOptions: [50, 100, 200] },
                searchBoxLabel: i18n.t("Search"),
            };
        }, [onAction, navigateTo]),
        React.useCallback(
            (search, pagination, sorting) => {
                console.debug(refreshTable);
                return new Promise((resolve, reject) => {
                    return compositionRoot.dataSets.getAll
                        .execute({
                            paging: pagination,
                            sorting: { field: parseSortField(sorting.field), order: sorting.order },
                            filters: { search },
                        })
                        .run(
                            response => {
                                resolve({
                                    objects: response.data,
                                    pager: {
                                        page: response.page,
                                        pageCount: response.pageCount,
                                        total: response.total,
                                        pageSize: response.pageSize,
                                    },
                                });
                            },
                            err => {
                                reject(new Error(err.message));
                            }
                        );
                });
            },
            [compositionRoot.dataSets.getAll, refreshTable]
        )
    );

    return tableConfig;
}

export type TableConfigProps = {
    onAction: (action: TableAction) => void;
    refreshTable: number;
};
