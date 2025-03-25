import React from "react";
import { DataSetAttrs } from "$/domain/entities/DataSet";
import { ObjectsTable } from "@eyeseetea/d2-ui-components";
import _ from "$/domain/entities/generic/Collection";

import { HomeTabs } from "$/webapp/components/home-tabs/HomeTabs";
import { useDataSetsRoutes } from "$/webapp/hooks/useDataSets";
import { useTableConfig } from "$/webapp/components/dataset-table/DataSetTableConfig";
import { DataSetDetails } from "$/webapp/components/dataset-table/DataSetDetails";
import { DataSetActions, TableAction } from "$/webapp/components/dataset-table/DataSetActions";
import { component } from "$/utils/react";
import { SettingsForm } from "$/webapp/components/settings-form/SettingsForm";

export type DataSetColumns = DataSetAttrs & { permissionDescription: string };

const DataSetTable_: React.FC = React.memo(() => {
    const [refreshTable, setRefreshTable] = React.useState(0);
    const [tableAction, setTableAction] = React.useState<TableAction>();
    const tableConfig = useTableConfig({ onAction: setTableAction, refreshTable });
    const { goToCreateDataSet } = useDataSetsRoutes();

    const refreshDataSets = React.useCallback((isCancelAction: boolean) => {
        setTableAction(undefined);
        if (!isCancelAction) {
            setRefreshTable(prevValue => prevValue + 1);
        }
    }, []);

    const closeSettingsModal = () => {
        setTableAction(undefined);
    };

    return (
        <>
            <HomeTabs activeTab="dataSets" />
            <ObjectsTable
                onActionButtonClick={goToCreateDataSet}
                className="dataset-table"
                {...tableConfig}
                sideComponents={
                    <DataSetDetails
                        visible={tableAction?.action === "details"}
                        id={tableAction?.ids[0] || ""}
                        onClose={() => setTableAction(undefined)}
                    />
                }
            />
            <DataSetActions tableAction={tableAction} onChangeAction={refreshDataSets} />
            {tableAction?.action === "app-settings" && (
                <SettingsForm onClose={closeSettingsModal} />
            )}
        </>
    );
});

export type TableConfigProps = { onAction: (action: TableAction) => void; refreshTable: number };

export const DataSetTable = component(DataSetTable_);
