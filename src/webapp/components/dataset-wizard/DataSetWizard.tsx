import i18n from "$/utils/i18n";
import { SetupDataSet } from "$/webapp/components/dataset-wizard/SetupDataSet";
import { Wizard, WizardStep } from "@eyeseetea/d2-ui-components";
import React from "react";

export type DataSetWizardProps = { id?: string };

export const DataSetWizard = React.memo((props: DataSetWizardProps) => {
    return (
        <Wizard
            onStepChangeRequest={(_currentStep: WizardStep, _nextStep: WizardStep) => {
                return Promise.resolve([]);
            }}
            useSnackFeedback
            steps={[
                {
                    component: () => <SetupDataSet />,
                    label: i18n.t("Setup"),
                    key: "setup",
                },
                {
                    component: () => <div>Step 2: {props.id}</div>,
                    label: "Step 2",
                    key: "step2",
                },
            ]}
        />
    );
});

DataSetWizard.displayName = "DataSetWizard";
