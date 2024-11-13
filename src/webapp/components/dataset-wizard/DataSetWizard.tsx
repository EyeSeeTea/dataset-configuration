import React from "react";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import { Grid, IconButton, Theme, Typography, createStyles } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";

import i18n from "$/utils/i18n";
import { getDataSetSteps } from "$/webapp/components/dataset-wizard/utils";
import { useNavigateTo } from "$/webapp/routes";

export type DataSetWizardProps = { id?: string };

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: { paddingBlock: theme.spacing(2) },
        titleContainer: { padding: theme.spacing(1) },
    })
);

export const DataSetWizard = React.memo((props: DataSetWizardProps) => {
    const { id } = props;
    const isEditing = Boolean(id);
    const actionTitle = isEditing ? i18n.t("Edit") : i18n.t("Create");
    const steps = getDataSetSteps();
    const classes = useStyles();
    const navigateTo = useNavigateTo();

    const goBackToHome = React.useCallback(() => {
        navigateTo("dataSets");
    }, [navigateTo]);

    return (
        <Grid container className={classes.root}>
            <Grid item xs={12} className={classes.titleContainer}>
                <Grid container alignItems="center" xs={3}>
                    <IconButton onClick={goBackToHome}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5">
                        {i18n.t("{{action}} dataSet", { action: actionTitle })}
                    </Typography>
                </Grid>
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
