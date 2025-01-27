import React from "react";
import i18n from "$/utils/i18n";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import _ from "$/domain/entities/generic/Collection";
import { Id } from "$/domain/entities/Ref";
import { ConfirmationModal } from "$/webapp/components/confirmation-modal/ConfirmationModal";
import { EditSharing } from "$/webapp/components/edit-sharing/EditSharing";
import { EditOrgUnits } from "$/webapp/components/edit-orgunits/EditOrgUnits";
import { DataSetLogs } from "$/webapp/components/dataset-logs/DataSetLogs";
import { Maybe } from "$/utils/ts-utils";
import { useDeleteDataSets } from "$/webapp/hooks/useDataSets";
import { component } from "$/utils/react";

export type DataSetActionsProps = {
    tableAction: Maybe<TableAction>;
    onChangeAction: (isCancelAction: boolean) => void;
};

function getSelectedIds(tableAction: Maybe<TableAction>): Id[] {
    return tableAction?.ids || [];
}

function getSelectedAction(tableAction: Maybe<TableAction>) {
    return tableAction?.action;
}

const DataSetActions_ = React.memo((props: DataSetActionsProps) => {
    const { onChangeAction, tableAction } = props;
    const snackbar = useSnackbar();
    const action = getSelectedAction(tableAction);
    const selectedIds = getSelectedIds(tableAction);

    const clearTableAction = React.useCallback(
        (isCancelAction?: boolean) => {
            onChangeAction(isCancelAction ?? false);
        },
        [onChangeAction]
    );

    const { deleteDataSets } = useDeleteDataSets({
        ids: selectedIds,
        onSuccess: () => {
            clearTableAction();
            snackbar.success(i18n.t("DataSets removed"));
        },
        onError: message => {
            snackbar.error(message);
            clearTableAction();
        },
    });

    const renderActions = () => {
        switch (action) {
            case "remove":
                return (
                    <ConfirmationModal
                        visible
                        onCancel={clearTableAction}
                        onSave={deleteDataSets}
                    />
                );
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

    return renderActions();
});

export type TableAction = {
    ids: Id[];
    action: "remove" | "sharing" | "orgUnits" | "logs" | "details";
};
export type TableConfigProps = { onAction: (action: TableAction) => void; refreshTable: number };
export const DataSetActions = component(DataSetActions_);
