import { DataSet, DataSetAttrs } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import {
    ObjectsTable,
    useLoading,
    useObjectsTable,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";
import React from "react";
import SharingIcon from "@material-ui/icons/Share";
import EditIcon from "@material-ui/icons/Edit";
import DomainIcon from "@material-ui/icons/Domain";
import DateRangeIcon from "@material-ui/icons/DateRange";
import DetailsIcon from "@material-ui/icons/Details";
import DeleteIcon from "@material-ui/icons/Delete";
import CopyIcon from "@material-ui/icons/FileCopy";
import ListIcon from "@material-ui/icons/List";
import _ from "$/domain/entities/generic/Collection";
import { SharingDetails } from "$/webapp/components/sharing-details/SharingDetails";
import { Id } from "$/domain/entities/Ref";
import { ConfirmationModal } from "$/webapp/components/confirmation-modal/ConfirmationModal";
import { EditSharing } from "$/webapp/components/edit-sharing/EditSharing";
import { EditOrgUnits } from "$/webapp/components/edit-orgunits/EditOrgUnits";
import { DataSetLogs } from "$/webapp/components/dataset-logs/DataSetLogs";

export type DataSetColumns = DataSetAttrs & { permissionDescription: string };
export type TableAction = {
    ids: Id[];
    action: "remove" | "sharing" | "orgUnits" | "logs";
};

function checkIdsAndAction(
    tableAction: TableAction | undefined,
    actionToValidate: TableAction["action"]
): boolean {
    if (!tableAction) return false;
    return tableAction.ids.length > 0 && tableAction.action === actionToValidate;
}

export const DataSetTable: React.FC = React.memo(() => {
    const { compositionRoot } = useAppContext();
    const [refreshTable, setRefreshTable] = React.useState(0);
    const [tableAction, setTableAction] = React.useState<TableAction>();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const tableConfig = useObjectsTable<DataSetColumns>(
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
                        name: "permissionDescription",
                        text: i18n.t("Access"),
                        sortable: false,
                        getValue: dataSet => dataSet.permissionDescription,
                    },
                    {
                        name: "lastUpdated",
                        text: i18n.t("Last updated"),
                        getValue: dataSet => dataSet.lastUpdated,
                    },
                ],
                details: [
                    { name: "name", text: i18n.t("Name") },
                    { name: "shortName", text: i18n.t("Short Name") },
                    { name: "description", text: i18n.t("Description") },
                    { name: "created", text: i18n.t("Created") },
                    { name: "lastUpdated", text: i18n.t("Last updated") },
                    { name: "id", text: i18n.t("ID") },
                    {
                        name: "coreCompetencies",
                        text: i18n.t("Core competencies"),
                        getValue: value => {
                            return value.coreCompetencies.map(cc => cc.name).join(", ");
                        },
                    },
                    {
                        name: "access",
                        text: i18n.t("Sharing"),
                        getValue: dataSet => {
                            return <SharingDetails dataSet={dataSet} />;
                        },
                    },
                ],
                actions: [
                    {
                        name: "edit",
                        text: i18n.t("Edit"),
                        icon: <EditIcon />,
                        multiple: false,
                    },
                    {
                        name: "sharing",
                        text: i18n.t("Sharing Settings"),
                        icon: <SharingIcon />,
                        multiple: true,
                        onClick(selectedIds) {
                            setTableAction({ ids: selectedIds, action: "sharing" });
                        },
                    },
                    {
                        name: "assign_orgunits",
                        text: i18n.t("Assign to Organisation Units"),
                        icon: <DomainIcon />,
                        multiple: true,
                        onClick: selectedIds => {
                            setTableAction({ ids: selectedIds, action: "orgUnits" });
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
                        name: "details",
                        text: i18n.t("Details"),
                        icon: <DetailsIcon />,
                        multiple: false,
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
                            setTableAction({ ids: selectedIds, action: "remove" });
                        },
                    },
                    {
                        name: "logs",
                        text: i18n.t("Logs"),
                        icon: <ListIcon />,
                        multiple: true,
                        onClick(selectedIds) {
                            setTableAction({ ids: selectedIds, action: "logs" });
                        },
                    },
                ],
                initialSorting: { field: "name", order: "asc" },
                paginationOptions: { pageSizeInitialValue: 50, pageSizeOptions: [50, 100, 200] },
                searchBoxLabel: i18n.t("Search"),
            };
        }, [setTableAction]),
        React.useCallback(
            (search, pagination, sorting) => {
                console.debug(refreshTable);
                return new Promise((resolve, reject) => {
                    return compositionRoot.dataSets.getAll
                        .execute({ paging: pagination, sorting: sorting, filters: { search } })
                        .run(
                            response => {
                                resolve({
                                    objects: response.data.map(dataSet => {
                                        return {
                                            ...dataSet,
                                            permissionDescription: DataSet.buildAccess(dataSet),
                                        };
                                    }),
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

    const closeModal = React.useCallback(() => {
        setTableAction(undefined);
    }, []);

    const clearTableAction = React.useCallback((refreshTable?: boolean) => {
        setTableAction(undefined);
        if (refreshTable) {
            setRefreshTable(prevValue => prevValue + 1);
        }
    }, []);

    const removeDataSets = React.useCallback(() => {
        loading.show(true, i18n.t("Removing DataSets"));
        return compositionRoot.dataSets.remove.execute(tableAction?.ids || []).run(
            () => {
                clearTableAction();
                setRefreshTable(prevValue => prevValue + 1);
                snackbar.success(i18n.t("DataSets removed"));
                loading.hide();
            },
            err => {
                snackbar.error(err.message);
                loading.hide();
                clearTableAction();
            }
        );
    }, [
        clearTableAction,
        compositionRoot.dataSets.remove,
        loading,
        snackbar,
        tableAction,
        setRefreshTable,
    ]);

    return (
        <div>
            <ObjectsTable {...tableConfig} />
            {checkIdsAndAction(tableAction, "remove") && (
                <ConfirmationModal visible onCancel={closeModal} onSave={removeDataSets} />
            )}
            {checkIdsAndAction(tableAction, "sharing") && (
                <EditSharing
                    onCancel={() => clearTableAction(true)}
                    dataSetIds={tableAction?.ids || []}
                />
            )}
            {checkIdsAndAction(tableAction, "orgUnits") && (
                <EditOrgUnits
                    onCancel={() => clearTableAction(true)}
                    dataSetIds={tableAction?.ids || []}
                />
            )}
            {checkIdsAndAction(tableAction, "logs") && (
                <DataSetLogs onCancel={clearTableAction} dataSetIds={tableAction?.ids || []} />
            )}
        </div>
    );
});

DataSetTable.displayName = "DataSetTable";
