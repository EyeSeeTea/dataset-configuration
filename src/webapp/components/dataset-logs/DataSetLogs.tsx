import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import styled from "styled-components";

import { Id } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useGetDataSetsByIds } from "$/webapp/hooks/useDataSets";
import { Log } from "$/domain/entities/Log";
import { DataSet } from "$/domain/entities/DataSet";

export type DataSetLogsProps = { dataSetIds: Id[]; onCancel: () => void };

export const DataSetLogs = React.memo((props: DataSetLogsProps) => {
    const { dataSetIds, onCancel } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const [logs, setLogs] = React.useState<Log[]>();

    const { dataSets } = useGetDataSetsByIds(dataSetIds);

    React.useEffect(() => {
        loading.show(true, i18n.t("Loading logs..."));
        const dataSetsIds = dataSets?.map(dataSet => dataSet.id) || [];
        return compositionRoot.logs.getByDataSets.execute({ dataSetsIds }).run(
            logs => {
                setLogs(logs);
                loading.hide();
            },
            err => {
                loading.hide();
                snackbar.error(err.message);
            }
        );
    }, [compositionRoot.logs.getByDataSets, dataSets, loading, snackbar]);

    return (
        <ConfirmationDialog
            open
            title={i18n.t("Logs")}
            cancelText={i18n.t("Close")}
            onCancel={onCancel}
            description={DataSet.joinShortNames(dataSets || [])}
            fullWidth
        >
            {logs?.map(log => {
                return (
                    <LogsContainer key={`${log.date}_${log.actionDescription}`}>
                        <LogItem label={i18n.t("Date")} value={log.date} />
                        <LogItem label={i18n.t("Action")} value={log.actionDescription} />
                        <LogItem label={i18n.t("Status")} value={log.status} />
                        <LogItem label={i18n.t("User")} value={log.user.username} />
                        <LogItem
                            label={i18n.t("Datasets")}
                            value={log.dataSets.map(ds => ds.shortName).join(", ")}
                        />
                    </LogsContainer>
                );
            })}
        </ConfirmationDialog>
    );
});

export type LogItemProps = { label: string; value: string };

export const LogItem = React.memo((props: LogItemProps) => {
    const { label, value } = props;
    return (
        <LogItemContainer>
            <strong>{label}: </strong>
            {value}
        </LogItemContainer>
    );
});

const LogsContainer = styled.ul`
    color: rgba(0, 0, 0, 0.6);
    list-style: none;
    padding-block: 0.5em;
    padding-inline: 0;
    margin: 0;
`;

const LogItemContainer = styled.li`
    line-height: 1;
`;

DataSetLogs.displayName = "DataSetLogs";
