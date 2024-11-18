import React from "react";
import i18n from "$/utils/i18n";
import { Id } from "$/domain/entities/Ref";
import { Paper, makeStyles } from "@material-ui/core";
import { useAppContext } from "$/webapp/contexts/app-context";
import { DataSet } from "$/domain/entities/DataSet";
import { toLongDateString } from "$/utils/date";
import { SharingDetails } from "$/webapp/components/sharing-details/SharingDetails";
import CloseIcon from "@material-ui/icons/Close";
import { component } from "$/utils/react";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

const useStyles = makeStyles({
    root: {
        flex: "0 1 0%",
        marginLeft: "1rem",
        marginRight: "1rem",
        padding: "1.5rem",
        opacity: 1,
        maxWidth: 500,
        minWidth: 300,
        height: "0%",
    },
    label: {
        fontWeight: "bold",
    },
    fieldValue: {
        color: "#333",
        minWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    field: {
        paddingBottom: "1rem",
        fontFamily: "Roboto",
    },
    closeButton: {
        cursor: "pointer",
        float: "right",
        display: "inline-block",
        position: "relative",
    },
});

export type DataSetDetailsProps = { id: Id; visible: boolean; onClose: () => void };

export const DataSetDetails_ = React.memo((props: DataSetDetailsProps) => {
    const { id, onClose, visible } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const classes = useStyles();
    const [dataSet, setDataSet] = React.useState<DataSet>();
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        compositionRoot.dataSets.getByIds.execute([id]).run(
            dataSets => {
                const firstDataSet = dataSets[0];
                if (!firstDataSet) return;
                setDataSet(firstDataSet);
                setIsLoading(false);
            },
            err => {
                snackbar.error(err.message);
                setIsLoading(false);
            }
        );
    }, [compositionRoot.dataSets.getByIds, id, snackbar]);

    if (!visible || !dataSet) return null;

    return (
        <Paper className={classes.root}>
            <CloseIcon className={classes.closeButton} onClick={onClose} />
            {isLoading ? (
                <div>{i18n.t("Loading details...")}</div>
            ) : (
                <div>
                    <DetailsItem label={i18n.t("Name")} value={dataSet.name} />
                    <DetailsItem label={i18n.t("Short name")} value={dataSet.shortName} />
                    <DetailsItem
                        label={i18n.t("Created")}
                        value={toLongDateString(dataSet.created)}
                    />
                    <DetailsItem
                        label={i18n.t("Last updated")}
                        value={toLongDateString(dataSet.lastUpdated)}
                    />
                    <DetailsItem label={i18n.t("Id")} value={dataSet.id} />
                    <DetailsItem
                        label={i18n.t("Linked project")}
                        value={dataSet.project?.name || i18n.t("No project linked")}
                    />
                    <DetailsItem
                        label={i18n.t("Core competencies")}
                        value={dataSet.coreCompetencies.map(cc => cc.name).join(", ")}
                    />
                    <DetailsItem label={i18n.t("Sharing")} />
                    <SharingDetails dataSet={dataSet} />
                </div>
            )}
        </Paper>
    );
});

export const DetailsItem_ = React.memo((props: { value?: string; label: string }) => {
    const { value, label } = props;
    const classes = useStyles();
    return (
        <div className={classes.field}>
            <div className={`${classes.fieldValue} ${classes.label}`}>{label}</div>
            <div className={classes.fieldValue}>{value || ""}</div>
        </div>
    );
});

export const DetailsItem = component(DetailsItem_);
export const DataSetDetails = component(DataSetDetails_);
