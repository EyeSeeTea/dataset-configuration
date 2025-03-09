import React from "react";
import { DataSet, DataSetAttrs } from "$/domain/entities/DataSet";
import { useAppContext } from "$/webapp/contexts/app-context";
import {
    TableAction as DataTableAction,
    ReferenceObject,
    useObjectsTable,
} from "@eyeseetea/d2-ui-components";
import SharingIcon from "@material-ui/icons/Share";
import EditIcon from "@material-ui/icons/Edit";
import DomainIcon from "@material-ui/icons/Domain";
import DateRangeIcon from "@material-ui/icons/DateRange";
import DetailsIcon from "@material-ui/icons/Details";
import DeleteIcon from "@material-ui/icons/Delete";
import CopyIcon from "@material-ui/icons/FileCopy";
import ListIcon from "@material-ui/icons/List";
import SettingsIcon from "@material-ui/icons/Settings";

import _ from "$/domain/entities/generic/Collection";
import i18n from "$/utils/i18n";
import { useNavigateTo } from "$/webapp/routes";
import { parseSortField } from "$/utils/parse-sort-field";
import { TableAction } from "$/webapp/components/dataset-table/DataSetActions";
import { User } from "$/domain/entities/User";
import { DataSetList } from "$/domain/entities/DataSetList";

export type DataSetColumns = DataSetAttrs & { permissionDescription: string };

export function useTableConfig(props: TableConfigProps) {
    const { onAction, refreshTable } = props;
    const { compositionRoot, currentUser } = useAppContext();
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
                globalActions: currentUser.isAdmin()
                    ? [
                          {
                              name: "settings",
                              text: i18n.t("Settings"),
                              icon: <SettingsIcon />,
                              onClick: () => {
                                  onAction({ ids: [], action: "app-settings" });
                              },
                          },
                      ]
                    : [],
                actions: [
                    {
                        name: "show_details",
                        text: i18n.t("Details"),
                        icon: <DetailsIcon />,
                        multiple: false,
                        onClick: selectedIds => {
                            onAction({ ids: selectedIds, action: "details" });
                        },
                    },
                    ...getCommonActions({
                        user: currentUser,
                        onAction,
                        navigateTo,
                        isActive: () => true,
                    }),
                ],
                initialSorting: { field: "name", order: "asc" },
                paginationOptions: { pageSizeInitialValue: 50, pageSizeOptions: [50, 100, 200] },
                searchBoxLabel: i18n.t("Search"),
            };
        }, [onAction, navigateTo, currentUser]),
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

export type TableConfigProps = { onAction: (action: TableAction) => void; refreshTable: number };

export type CommonActionsProps<T> = {
    isActive: (data: T[]) => boolean;
    onAction: (action: TableAction) => void;
    navigateTo: ReturnType<typeof useNavigateTo>;
    user: User;
};

export function getCommonActions<T extends ReferenceObject>(
    props: CommonActionsProps<T>
): DataTableAction<T>[] {
    const { onAction, navigateTo, user } = props;
    return [
        {
            name: "edit",
            text: i18n.t("Edit"),
            icon: <EditIcon />,
            multiple: false,
            primary: true,
            isActive: records => {
                return props.isActive(records) && canDataSetBeUpdated(records, user);
            },
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
            isActive: records => {
                return props.isActive(records) && canDataSetBeUpdated(records, user);
            },
            onClick(selectedIds) {
                onAction({ ids: selectedIds, action: "sharing" });
            },
        },
        {
            name: "assign_orgunits",
            text: i18n.t("Assign to Organisation Units"),
            icon: <DomainIcon />,
            multiple: true,
            isActive: records => {
                return props.isActive(records) && canDataSetBeUpdated(records, user);
            },
            onClick: selectedIds => {
                onAction({ ids: selectedIds, action: "orgUnits" });
            },
        },
        {
            name: "set_period_dates",
            text: i18n.t("Set output/outcome period dates"),
            icon: <DateRangeIcon />,
            multiple: true,
            isActive: records => {
                return props.isActive(records) && canDataSetBeUpdated(records, user);
            },
            onClick: selectedIds => {
                onAction({ ids: selectedIds, action: "set_period_dates" });
            },
        },
        {
            name: "clone",
            text: i18n.t("Clone"),
            icon: <CopyIcon />,
            multiple: false,
            isActive: records => props.isActive(records) && user.access.canCreateDataSets,
        },
        {
            name: "delete",
            text: i18n.t("Delete"),
            icon: <DeleteIcon />,
            multiple: true,
            isActive: records => props.isActive(records) && user.access.canDeleteDataSets,
            onClick(selectedIds) {
                onAction({ ids: selectedIds, action: "remove" });
            },
        },
        {
            name: "logs",
            text: i18n.t("Logs"),
            icon: <ListIcon />,
            multiple: true,
            isActive: records => props.isActive(records) && user.isAdmin(),
            onClick(selectedIds) {
                onAction({ ids: selectedIds, action: "logs" });
            },
        },
    ];
}

function canDataSetBeUpdated<T>(records: T[], user: User): boolean {
    return records.every(dataSet => {
        if (dataSet instanceof DataSetList) {
            return dataSet.hasPermissionsToUpdate(user);
        }
    });
}
