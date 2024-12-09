import React from "react";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import { Grid, IconButton, Theme, Typography, createStyles } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";

import i18n from "$/utils/i18n";
import { getDataSetSteps } from "$/webapp/components/dataset-wizard/utils";
import { useNavigateTo } from "$/webapp/routes";
import { DataSet } from "$/domain/entities/DataSet";
import { useAppContext } from "$/webapp/contexts/app-context";
import { getErrors } from "$/domain/entities/generic/Error";
import { Project } from "$/domain/entities/Project";

export type DataSetWizardProps = {
    id?: string;
    projects: Project[];
    dataSet: DataSet;
    updateDataSet: React.Dispatch<React.SetStateAction<DataSet>>;
};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: { paddingBlock: theme.spacing(2) },
        titleContainer: { padding: theme.spacing(1) },
    })
);

export type ValidationStatusType = "idle" | "loading" | "error" | "success";

export const DataSetWizard = React.memo((props: DataSetWizardProps) => {
    const { compositionRoot } = useAppContext();
    const { id, dataSet, projects, updateDataSet } = props;
    const isEditing = Boolean(id);
    const actionTitle = isEditing ? i18n.t("Edit") : i18n.t("Create");
    const steps = getDataSetSteps();
    const classes = useStyles();
    const navigateTo = useNavigateTo();
    const [validationStatus, setValidationStatus] = React.useState<ValidationStatusType>("idle");

    const { validateSteps } = useValidateDataSetWizard({ validationStatus, dataSet });

    const goBackToHome = React.useCallback(() => {
        navigateTo("dataSets");
    }, [navigateTo]);

    const validateDataSetName = React.useCallback(
        (name: string) => {
            setValidationStatus("loading");
            return compositionRoot.dataSets.validateName
                .execute({ name, dataSetId: dataSet.id })
                .run(
                    duplicateName => {
                        setValidationStatus(duplicateName ? "error" : "success");
                    },
                    error => {
                        console.error(error.message);
                        setValidationStatus("error");
                    }
                );
        },
        [compositionRoot.dataSets.validateName, dataSet.id]
    );

    const stepsWithProps = React.useMemo(() => {
        return steps.map(step => {
            return {
                ...step,
                props: {
                    dataSet,
                    onValidate: validateDataSetName,
                    validationStatus,
                    onChange: updateDataSet,
                    projects,
                },
            };
        });
    }, [dataSet, projects, steps, validateDataSetName, validationStatus, updateDataSet]);

    return (
        <Grid container className={classes.root}>
            <Grid item xs={12} className={classes.titleContainer}>
                <Grid container alignItems="center">
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
                    onStepChangeRequest={validateSteps}
                    useSnackFeedback
                    steps={stepsWithProps}
                    initialStepKey="setup"
                />
            </Grid>
        </Grid>
    );
});

export function useValidateDataSetWizard(props: {
    validationStatus: ValidationStatusType;
    dataSet: DataSet;
}) {
    const { validationStatus, dataSet } = props;

    const validationInProgressOrError =
        !validationStatus || validationStatus === "error" || validationStatus === "loading";

    const validateSteps = React.useCallback(
        (currentStep: WizardStep) => {
            if (validationInProgressOrError) {
                return Promise.resolve(["Validation name in progress"]);
            } else if (currentStep.key === "setup") {
                const result = dataSet.validateSetup();
                return result.isError()
                    ? Promise.resolve(getErrors(result.value.error))
                    : Promise.resolve([]);
            } else {
                return Promise.resolve([]);
            }
        },
        [dataSet, validationInProgressOrError]
    );

    return { validateSteps };
}

DataSetWizard.displayName = "DataSetWizard";
