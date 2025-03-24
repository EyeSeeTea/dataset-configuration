import React from "react";
import { Wizard, WizardStep, useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Button, Grid, IconButton, Theme, Typography, createStyles } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";

import i18n from "$/utils/i18n";
import { STEP_SUMMARY_KEY, getDataSetSteps } from "$/webapp/components/dataset-wizard/utils";
import { useNavigateTo } from "$/webapp/routes";
import { DataSet } from "$/domain/entities/DataSet";
import { useAppContext } from "$/webapp/contexts/app-context";
import { ValidationError, getErrors } from "$/domain/entities/generic/Error";
import { Project } from "$/domain/entities/Project";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { useSaveDataSet } from "$/webapp/components/dataset-wizard/SummaryDataSet";
import styled from "styled-components";
import { NavigationProps } from "@eyeseetea/d2-ui-components/wizard/Navigation";

export type DataSetWizardProps = {
    id?: string;
    projects: Project[];
    dataSet: DataSet;
    updateDataSet: React.Dispatch<React.SetStateAction<DataSet>>;
    dataSetSettings: DataSetSettings;
};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: { paddingBlock: theme.spacing(2) },
        titleContainer: { padding: theme.spacing(1) },
    })
);

export type ValidationStatusType = "idle" | "loading" | "error" | "success";

export const DataSetWizard = React.memo((props: DataSetWizardProps) => {
    const { compositionRoot, config } = useAppContext();
    const { dataSet, id, projects, updateDataSet, dataSetSettings } = props;
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
        return steps
            .filter(step => {
                if (step.key !== "share") return true;
                return dataSet.project === undefined;
            })
            .map(step => {
                return {
                    ...step,
                    props: {
                        config,
                        dataSet,
                        onValidate: validateDataSetName,
                        validationStatus,
                        onChange: updateDataSet,
                        projects,
                        dataSetSettings,
                    },
                };
            });
    }, [
        config,
        dataSet,
        dataSetSettings,
        projects,
        steps,
        validateDataSetName,
        validationStatus,
        updateDataSet,
    ]);

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
                    className="wizard-dataset"
                    showNavigationTop
                    NavigationComponent={props => (
                        <CustomNavigationComponent {...props} dataSet={dataSet} />
                    )}
                />
            </Grid>
        </Grid>
    );
});

const CustomNavigationComponent = (props: NavigationProps & { dataSet: DataSet }) => {
    const { dataSet } = props;
    const loading = useLoading();
    const snackbar = useSnackbar();
    const navigateTo = useNavigateTo();
    const { saveDataSet } = useSaveDataSet({
        dataSet,
        onLoading: () => loading.show(true, i18n.t("Saving...")),
        onSuccess: () => {
            loading.hide();
            snackbar.success(i18n.t("Data set saved successfully"));
            navigateTo("dataSets");
        },
        onError: error => {
            loading.hide();
            snackbar.error(error);
        },
    });

    const isFinalStep = props.currentStepKey === STEP_SUMMARY_KEY;

    const onSaveDataSet = () => {
        if (isFinalStep) {
            saveDataSet();
        } else {
            props.onNext();
        }
    };

    return (
        <WizardButtonsContainer>
            <Button variant="contained" onClick={props.onPrev} disabled={props.disablePrev}>
                {i18n.t("Previous")}
            </Button>
            <Button variant="contained" color="primary" onClick={onSaveDataSet}>
                {isFinalStep ? i18n.t("Save") : i18n.t("Next")}
            </Button>
        </WizardButtonsContainer>
    );
};

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
                const errorMessage = getErrorByValidationStatus(validationStatus);
                return Promise.resolve([errorMessage]);
            }

            const validationMap: ValidationStepType = {
                setup: () => dataSet.validateSetup(),
                indicators: () => dataSet.validateIndicatorsStep(),
                share: () => dataSet.validateRegionCodes(),
            };

            const validate = validationMap[currentStep.key];
            if (validate) {
                const result = validate();
                return result.length > 0 ? Promise.resolve(getErrors(result)) : Promise.resolve([]);
            } else {
                return Promise.resolve([]);
            }
        },
        [dataSet, validationInProgressOrError, validationStatus]
    );

    return { validateSteps };
}

function getErrorByValidationStatus(status: ValidationStatusType): string {
    switch (status) {
        case "error":
            return i18n.t("Data set name already exists");
        case "loading":
            return i18n.t("Validation name in progress");
        default:
            return "";
    }
}

type ValidationStepType = Record<string, () => ValidationError<DataSet>[]>;

const WizardButtonsContainer = styled.div`
    display: flex;
    gap: 1em;
    justify-content: flex-end;
    padding: 1em;
`;

DataSetWizard.displayName = "DataSetWizard";
