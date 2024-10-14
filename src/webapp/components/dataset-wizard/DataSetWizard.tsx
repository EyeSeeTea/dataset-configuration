import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import { Grid, Theme, Typography, createStyles } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import React from "react";

import i18n from "$/utils/i18n";
import { IndicatorsDataSet } from "$/webapp/components/dataset-wizard/IndicatorsDataSet";
import { SetupDataSet } from "$/webapp/components/dataset-wizard/SetupDataSet";
import { ShareOptionsDataSet } from "$/webapp/components/dataset-wizard/ShareOptionsDataSet";
import { SummaryDataSet } from "$/webapp/components/dataset-wizard/SummaryDataSet";

export type DataSetWizardProps = { id?: string };

const steps = [
    {
        component: () => <SetupDataSet />,
        label: i18n.t("Setup"),
        key: "setup",
    },
    {
        component: () => <IndicatorsDataSet />,
        label: i18n.t("Indicators"),
        key: "indicators",
    },
    {
        component: () => <ShareOptionsDataSet />,
        label: i18n.t("Share"),
        key: "share",
    },
    {
        component: () => <SummaryDataSet />,
        label: i18n.t("Summary and Save"),
        key: "summary",
    },
];

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            paddingBlock: theme.spacing(2),
        },
        titleContainer: {
            padding: theme.spacing(1),
        },
    })
);

export const DataSetWizard = React.memo((props: DataSetWizardProps) => {
    const { id } = props;
    const isEditing = Boolean(id);
    const actionTitle = isEditing ? i18n.t("Edit") : i18n.t("Create");

    const classes = useStyles();

    return (
        <Grid container className={classes.root}>
            <Grid item xs={12} className={classes.titleContainer}>
                <Typography variant="h5">
                    {i18n.t("{{action}} a new dataSet", { action: actionTitle })}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Wizard
                    onStepChangeRequest={(_currentStep: WizardStep, _nextStep: WizardStep) => {
                        return Promise.resolve([]);
                    }}
                    useSnackFeedback
                    steps={steps}
                />
            </Grid>
        </Grid>
    );
});

DataSetWizard.displayName = "DataSetWizard";
