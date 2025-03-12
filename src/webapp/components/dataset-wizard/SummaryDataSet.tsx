import React from "react";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Button, Grid, Typography } from "@material-ui/core";

import { DataSet, OrgUnit } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { component } from "$/utils/react";
import { useNavigateTo } from "$/webapp/routes";

export type SummaryDataSetProps = { dataSet: DataSet };

const MAX_ORG_UNITS_TO_SHOW = 3;

const SummaryDataSet_ = React.memo((props: SummaryDataSetProps) => {
    const { compositionRoot } = useAppContext();
    const { dataSet } = props;
    const [orgUnits, setOrgUnits] = React.useState<OrgUnit[]>([]);
    const snackbar = useSnackbar();
    const navigateTo = useNavigateTo();
    const loading = useLoading();
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

    React.useEffect(() => {
        const firstThreeOrgUnits = _(dataSet.orgUnits)
            .take(MAX_ORG_UNITS_TO_SHOW)
            .map(ou => ou.id)
            .value();

        return compositionRoot.orgUnits.getByIds
            .execute(firstThreeOrgUnits)
            .run(setOrgUnits, error => snackbar.error(error.message));
    }, [compositionRoot.orgUnits.getByIds, dataSet.orgUnits, snackbar]);

    return (
        <Grid container>
            <Grid item xs={12}>
                <Typography variant="body1">
                    {i18n.t("The dataSet is finished. Press the button Save to save the data")}
                </Typography>
            </Grid>
            <SummaryList dataSet={dataSet} orgUnits={orgUnits} />
            <Grid item xs={12}>
                <Button onClick={saveDataSet} color="primary" variant="contained">
                    {i18n.t("Save")}
                </Button>
            </Grid>
        </Grid>
    );
});

export const SummaryDataSet = component(SummaryDataSet_);

export const SummaryList = React.memo((props: { dataSet: DataSet; orgUnits: OrgUnit[] }) => {
    const { config } = useAppContext();
    const { dataSet, orgUnits } = props;

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
                    value={`${orgUnits.map(ou => ou.name).join(", ")} ${orgUnitMessage}`}
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

function useSaveDataSet(props: {
    dataSet: DataSet;
    onLoading: () => void;
    onSuccess: () => void;
    onError: (error: string) => void;
}) {
    const { compositionRoot } = useAppContext();
    const { dataSet, onLoading, onSuccess, onError } = props;

    const saveDataSet = React.useCallback(() => {
        onLoading();
        return compositionRoot.dataSets.save.execute(dataSet).run(
            () => {
                onSuccess();
            },
            error => {
                onError(error.message);
            }
        );
    }, [compositionRoot.dataSets.save, dataSet, onLoading, onSuccess, onError]);

    return { saveDataSet };
}
