import React from "react";
import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { Id } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useGetDataSetsByIds, useSaveOrgUnits } from "$/webapp/hooks/useDataSets";
import _ from "$/domain/entities/generic/Collection";
import { FormControlLabel, Switch } from "@material-ui/core";

export type EditOrgUnitsProps = { dataSetIds: Id[]; onCancel: () => void };

export const EditOrgUnits = React.memo((props: EditOrgUnitsProps) => {
    const { dataSetIds, onCancel } = props;
    const { api } = useAppContext();

    const { dataSets } = useGetDataSetsByIds(dataSetIds);
    const firstDataSet = _(dataSets || []).first();
    const multipleDataSets = dataSetIds.length > 1;
    const [selectedOrgUnits, setSelectedOrgUnits] = React.useState<string[]>();
    const [action, setAction] = React.useState<"merge" | "replace">("replace");

    const { saveOrgUnits } = useSaveOrgUnits();

    const onUpdateOrgUnit = React.useCallback((paths: string[]) => {
        setSelectedOrgUnits(paths);
    }, []);

    const initialOrgUnits = selectedOrgUnits
        ? selectedOrgUnits
        : multipleDataSets
        ? []
        : firstDataSet?.orgUnits.map(ou => `/${ou.paths.join("/")}`) || [];

    const onSaveOrgUnits = React.useCallback(() => {
        if (!selectedOrgUnits) return;
        return saveOrgUnits(dataSetIds, selectedOrgUnits, action);
    }, [action, dataSetIds, saveOrgUnits, selectedOrgUnits]);

    const actionLabel = action === "replace" ? i18n.t("Replace") : i18n.t("Merge");

    const updateAction = React.useCallback(
        (_: React.ChangeEvent<HTMLInputElement>, value: boolean) => {
            setAction(value ? "replace" : "merge");
        },
        []
    );

    if (!firstDataSet) return null;

    return (
        <ConfirmationDialog
            maxWidth="lg"
            open
            onCancel={onCancel}
            title={i18n.t("Organisation Units")}
            saveText={i18n.t("Save")}
            onSave={onSaveOrgUnits}
            cancelText={i18n.t("Close")}
        >
            {multipleDataSets && (
                <FormControlLabel
                    control={
                        <Switch
                            checked={action === "replace"}
                            onChange={updateAction}
                            name="action"
                        />
                    }
                    label={i18n.t("Bulk update strategy: {{actionLabel}}", {
                        nsSeparator: false,
                        actionLabel,
                    })}
                />
            )}

            <OrgUnitsSelector api={api} onChange={onUpdateOrgUnit} selected={initialOrgUnits} />
        </ConfirmationDialog>
    );
});

EditOrgUnits.displayName = "EditOrgUnits";
