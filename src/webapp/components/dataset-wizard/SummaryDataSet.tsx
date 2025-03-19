import React from "react";
import { useLocation } from "react-router-dom";
import { Grid, Typography } from "@material-ui/core";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { component } from "$/utils/react";

export type SummaryDataSetProps = { dataSet: DataSet };

const MAX_ORG_UNITS_TO_SHOW = 3;

const SummaryDataSet_ = React.memo((props: SummaryDataSetProps) => {
    const { dataSet } = props;

    return (
        <Grid container>
            <Grid item xs={12}>
                <Typography variant="body1">
                    {i18n.t("The dataSet is finished. Press the button Save to save the data")}
                </Typography>
            </Grid>
            <SummaryList dataSet={dataSet} />
        </Grid>
    );
});

export const SummaryDataSet = component(SummaryDataSet_);

export const SummaryList = React.memo((props: { dataSet: DataSet }) => {
    const { config } = useAppContext();
    const { dataSet } = props;

    const extraOrgUnits = dataSet.orgUnits.length - MAX_ORG_UNITS_TO_SHOW;
    const orgUnitMessage =
        extraOrgUnits > 0 ? i18n.t("and {{number}} more.", { number: extraOrgUnits }) : "";

    const coreCompetenciesNames = _(dataSet.indicators)
        .map(indicator => indicator.coreCompetency?.name || "")
        .uniq()
        .join(", ");

    const regionsCodes = dataSet.getRegionCodesFromAccess();
    const selectedRegions = config.regions.filter(region => regionsCodes.includes(region.code));

    return (
        <Grid item xs={12}>
            <ul>
                <SummaryItem label={i18n.t("Name")} value={dataSet.name} />
                <SummaryItem label={i18n.t("Description")} value={dataSet.description} />
                <SummaryItem label={i18n.t("Core competencies")} value={coreCompetenciesNames} />
                <SummaryItem label={i18n.t("Linked Project")} value={dataSet.project?.name || ""} />
                <SummaryItem
                    label={i18n.t("Organisation Units")}
                    value={`${dataSet.orgUnits.map(ou => ou.name).join(", ")} ${orgUnitMessage}`}
                />
                <SummaryItem
                    label="Countries"
                    value={selectedRegions.map(region => region.name).join(", ")}
                />
            </ul>
        </Grid>
    );
});

export const SummaryItem = React.memo((props: { label: string; value: string }) => {
    return (
        <li>
            <strong>{props.label}:</strong> {props.value}
        </li>
    );
});

export const actions = ["edit", "create", "clone"] as const;
export type DataSetRegisterAction = (typeof actions)[number];

function getActionFromUrl(url: string): DataSetRegisterAction {
    if (url.includes("edit")) return "edit";
    if (url.includes("create")) return "create";
    if (url.includes("clone")) return "clone";
    throw new Error("Invalid action");
}

export function useSaveDataSet(props: {
    dataSet: DataSet;
    onLoading: () => void;
    onSuccess: () => void;
    onError: (error: string) => void;
}) {
    const location = useLocation();
    const action = getActionFromUrl(location.pathname);
    const { compositionRoot, currentUser } = useAppContext();
    const { dataSet, onLoading, onSuccess, onError } = props;

    const saveDataSet = React.useCallback(() => {
        onLoading();
        return compositionRoot.dataSets.save.execute({ dataSet, user: currentUser, action }).run(
            () => {
                onSuccess();
            },
            error => {
                onError(error.message);
            }
        );
    }, [
        action,
        currentUser,
        compositionRoot.dataSets.save,
        dataSet,
        onLoading,
        onSuccess,
        onError,
    ]);

    return { saveDataSet };
}
