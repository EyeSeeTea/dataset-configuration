import { ConfirmationDialog, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";
import styled from "styled-components";
import { Button } from "@material-ui/core";

import { ISODateString, Id } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useGetDataSetsByIds } from "$/webapp/hooks/useDataSets";
import { Log } from "$/domain/entities/Log";
import { DataSet } from "$/domain/entities/DataSet";
import { toLongDateString } from "$/utils/date";
import _ from "$/domain/entities/generic/Collection";

export type DataSetLogsProps = { dataSetIds: Id[]; onCancel: () => void };

function useGetLogsByPage(props: { dataSets?: DataSet[]; page?: number }) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const { dataSets, page } = props;
    const [logs, setLogs] = React.useState<Log[]>([]);

    React.useEffect(() => {
        if (!dataSets) return;
        loading.show(true, i18n.t("Loading logs..."));
        const dataSetsIds = dataSets?.map(dataSet => dataSet.id) || [];
        return compositionRoot.logs.getByDataSets.execute({ dataSetsIds, page }).run(
            logs => {
                setLogs(prev => {
                    return prev.concat(logs);
                });
                loading.hide();
            },
            err => {
                loading.hide();
                snackbar.error(err.message);
            }
        );
    }, [compositionRoot.logs.getByDataSets, dataSets, loading, snackbar, page]);

    return { logs, setLogs };
}

export const DataSetLogs = React.memo((props: DataSetLogsProps) => {
    const { dataSetIds, onCancel } = props;

    const { dataSets } = useGetDataSetsByIds(dataSetIds);
    const [page, setPage] = React.useState(0);
    const { logs } = useGetLogsByPage({ dataSets, page });

    const lastDate = _(logs).last()?.date;

    const fetchMoreLogs = () => {
        setPage(prev => prev + 2);
    };

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
                        <LogItem label={i18n.t("Date")} value={formatDate(log.date)} />
                        <LogItem label={i18n.t("Action")} value={log.actionDescription} />
                        <LogItem label={i18n.t("Status")} value={log.status} />
                        <LogItem label={i18n.t("User")} value={log.user.username} />
                        <LogItem
                            label={i18n.t("Datasets")}
                            value={log.dataSets.map(ds => ds.name).join(", ")}
                        />
                    </LogsContainer>
                );
            })}
            <ButtonContainer>
                <Button onClick={fetchMoreLogs}>
                    {i18n.t("Load logs older than")} {formatDate(lastDate || "")}
                </Button>
            </ButtonContainer>
        </ConfirmationDialog>
    );
});

function formatDate(date: ISODateString): string {
    if (!date) return "";
    return toLongDateString(date, {
        weekday: undefined,
        month: "numeric",
        second: "2-digit",
    });
}

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

const ButtonContainer = styled.div`
    text-align: center;
`;

DataSetLogs.displayName = "DataSetLogs";
