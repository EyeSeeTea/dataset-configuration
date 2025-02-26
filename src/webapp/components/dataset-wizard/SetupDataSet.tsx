import React from "react";
import { OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import {
    Grid,
    IconButton,
    Typography,
    TextField,
    Checkbox,
    FormControlLabel,
} from "@material-ui/core";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { ValidationStatusType } from "$/webapp/components/dataset-wizard/DataSetWizard";
import { Project } from "$/domain/entities/Project";
import { ProjectsSelectorModal } from "$/webapp/components/dataset-wizard/ProjectsSelectorModal";
import { Maybe } from "$/utils/ts-utils";
import { component } from "$/utils/react";
import _ from "$/domain/entities/generic/Collection";

export type SetupDataSetProps = {
    dataSet: DataSet;
    onValidate: (value: string) => void;
    onChange: (dataSet: DataSet) => void;
    validationStatus: ValidationStatusType;
    projects: Project[];
};

const SetupDataSet_ = React.memo((props: SetupDataSetProps) => {
    const { api, config, compositionRoot } = useAppContext();
    const { dataSet, onChange, onValidate, projects, validationStatus } = props;
    const [projectModalOpen, setProjectModalOpen] = React.useState(false);

    const openProjectModal = React.useCallback(() => {
        setProjectModalOpen(true);
    }, []);

    const validateName = React.useMemo(
        () =>
            debounce((value: string) => {
                if (value) onValidate(value);
            }, 700),
        [onValidate]
    );

    const updateValues = React.useCallback(
        (field: keyof DataSet, value: string | boolean) => {
            if (typeof value === "boolean") {
                const updateData = dataSet.update(field, value);
                onChange(updateData);
            } else if (typeof value === "number") {
                const updateData = dataSet.update(field, Number(value) ?? 0);
                onChange(updateData);
            } else {
                const updateData = dataSet.update(field, value);
                onChange(updateData);
            }

            if (field === "name") validateName(value.toString());
        },
        [onChange, validateName, dataSet]
    );

    const updateOrgUnits = React.useCallback(
        (paths: string[]) => {
            const idsFromPaths = paths.map(path => _(path.split("/")).last() || "");
            compositionRoot.orgUnits.getByIds.execute(idsFromPaths).run(orgUnitsDetails => {
                const updateData = DataSet.create({ ...dataSet, orgUnits: orgUnitsDetails });
                onChange(updateData.updateAccess(config));
            }, console.error);
        },
        [compositionRoot.orgUnits.getByIds, onChange, dataSet, config]
    );

    const updateProject = React.useCallback(
        (project: Maybe<Project>) => {
            const updatedData = dataSet.updateProject(project, config);
            onChange(updatedData);
            setProjectModalOpen(false);
        },
        [config, onChange, setProjectModalOpen, dataSet]
    );

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    label={i18n.t("Select Project")}
                    onClick={openProjectModal}
                    InputProps={{
                        readOnly: true,
                        endAdornment: (
                            <IconButton onClick={openProjectModal}>
                                <OpenInNewIcon />
                            </IconButton>
                        ),
                    }}
                    value={dataSet.project?.name ?? ""}
                />
            </Grid>

            <Grid item xs={12}>
                <TextField
                    error={validationStatus === "error"}
                    fullWidth
                    helperText={getDuplicateNameError(validationStatus)}
                    placeholder={i18n.t("DataSet name")}
                    value={dataSet.name}
                    onChange={event => updateValues("name", event.target.value)}
                />
            </Grid>

            <Grid item xs={12}>
                <TextField
                    fullWidth
                    placeholder={i18n.t("DataSet description")}
                    value={dataSet.description}
                    onChange={event => updateValues("description", event.target.value)}
                />
            </Grid>

            <Grid item xs={12}>
                <TextField
                    fullWidth
                    placeholder={i18n.t("Expiry Days")}
                    value={dataSet.expiryDays}
                    helperText={i18n.t(
                        "How many days after the period before the dataSet is locked for changing data. Example: 5 means: after February 5th it's not possible to make changes to January anymore. 0 is no lock",
                        { nsSeparator: false }
                    )}
                    type="number"
                    inputProps={{ min: 0 }}
                    onChange={event => updateValues("expiryDays", event.target.value)}
                />
            </Grid>

            <Grid item xs={12}>
                <TextField
                    fullWidth
                    placeholder={i18n.t("Open future periods for data entry")}
                    value={dataSet.openFuturePeriods}
                    type="number"
                    inputProps={{ min: 0 }}
                    onChange={event => updateValues("openFuturePeriods", event.target.value)}
                />
            </Grid>

            <Grid item xs={12}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={dataSet.notifyUser}
                            onChange={event => updateValues("notifyUser", event.target.checked)}
                            name="notification"
                        />
                    }
                    label="Send notification to completing user"
                />
            </Grid>

            <Grid item xs={12}>
                <Typography variant="h6">{i18n.t("Select org units")}</Typography>
            </Grid>

            <Grid item xs={12}>
                <OrgUnitsSelector
                    api={api}
                    selected={dataSet.orgUnits.map(orgUnit => `/${orgUnit.path.join("/")}`)}
                    onChange={updateOrgUnits}
                />
            </Grid>

            {projectModalOpen && (
                <ProjectsSelectorModal
                    projects={projects}
                    onChange={updateProject}
                    onClose={() => setProjectModalOpen(false)}
                />
            )}
        </Grid>
    );
});

function debounce<F extends (...args: any[]) => any>(func: F, delay: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: Parameters<F>): void => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), delay);
    };

    return debounced;
}

function getDuplicateNameError(validationStatus: ValidationStatusType) {
    switch (validationStatus) {
        case "error":
            return i18n.t("There is already a dataset with this name");
        case "loading":
            return i18n.t("Validating...");
        case "success":
            return "";
        default:
            return "";
    }
}

export const SetupDataSet = component(SetupDataSet_);
