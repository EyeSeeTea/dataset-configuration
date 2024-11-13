import React from "react";
import { DataSetAttrs } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { ObjectsTable, useSnackbar } from "@eyeseetea/d2-ui-components";
import _ from "$/domain/entities/generic/Collection";
import { Id } from "$/domain/entities/Ref";
import { ConfirmationModal } from "$/webapp/components/confirmation-modal/ConfirmationModal";
import { EditSharing } from "$/webapp/components/edit-sharing/EditSharing";
import { EditOrgUnits } from "$/webapp/components/edit-orgunits/EditOrgUnits";
import { DataSetLogs } from "$/webapp/components/dataset-logs/DataSetLogs";
import { HomeTabs } from "$/webapp/components/home-tabs/HomeTabs";
import { Maybe } from "$/utils/ts-utils";
import { useDeleteDataSets } from "$/webapp/hooks/useDataSets";
import { useTableConfig } from "$/webapp/components/dataset-table/DataSetTableConfig";
import { useNavigateTo } from "$/webapp/routes";

export type DataSetColumns = DataSetAttrs & { permissionDescription: string };
export type TableAction = { ids: Id[]; action: "remove" | "sharing" | "orgUnits" | "logs" };

function getSelectedIds(tableAction: Maybe<TableAction>): Id[] {
    return tableAction?.ids || [];
}

function getSelectedAction(tableAction: Maybe<TableAction>) {
    return tableAction?.action;
}

export const DataSetTable: React.FC = React.memo(() => {
    const [refreshTable, setRefreshTable] = React.useState(0);
    const [tableAction, setTableAction] = React.useState<TableAction>();

    const navigateTo = useNavigateTo();
    const snackbar = useSnackbar();
    const action = getSelectedAction(tableAction);
    const selectedIds = getSelectedIds(tableAction);
    const tableConfig = useTableConfig({ onAction: setTableAction, refreshTable });

    const clearTableAction = React.useCallback((refreshTable?: boolean) => {
        setTableAction(undefined);
        if (refreshTable) {
            setRefreshTable(prevValue => prevValue + 1);
        }
    }, []);

    const { deleteDataSets } = useDeleteDataSets({
        ids: selectedIds,
        onSuccess: () => {
            clearTableAction();
            setRefreshTable(prevValue => prevValue + 1);
            snackbar.success(i18n.t("DataSets removed"));
        },
        onError: message => {
            snackbar.error(message);
            clearTableAction();
        },
    });

    const closeModal = React.useCallback(() => {
        setTableAction(undefined);
    }, []);

    const goToCreateDataSet = React.useCallback(() => {
        navigateTo("createDataSets");
    }, [navigateTo]);

    const renderActions = () => {
        switch (action) {
            case "remove":
                return <ConfirmationModal visible onCancel={closeModal} onSave={deleteDataSets} />;
            case "sharing":
                return (
                    <EditSharing onCancel={() => clearTableAction(true)} dataSetIds={selectedIds} />
                );
            case "orgUnits":
                return (
                    <EditOrgUnits
                        onCancel={() => clearTableAction(true)}
                        dataSetIds={selectedIds}
                    />
                );
            case "logs":
                return <DataSetLogs onCancel={clearTableAction} dataSetIds={selectedIds} />;
            default:
                return null;
        }
    };

    return (
        <>
            <HomeTabs activeTab="dataSets" />
            <ObjectsTable onActionButtonClick={goToCreateDataSet} {...tableConfig} />
            {renderActions()}
        </>
    );
});

export type TableConfigProps = { onAction: (action: TableAction) => void; refreshTable: number };

DataSetTable.displayName = "DataSetTable";
