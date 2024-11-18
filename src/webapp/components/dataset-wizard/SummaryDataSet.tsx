import i18n from "$/utils/i18n";
import { Grid, Typography } from "@material-ui/core";
import React from "react";

export type SummaryDataSetProps = {};

export const SummaryDataSet = React.memo((_props: SummaryDataSetProps) => {
    return (
        <Grid container>
            <Grid item xs={12}>
                <Typography variant="body1">
                    {i18n.t("The dataSet is finished. Press the button Save to save the data")}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <ul>
                    <SummaryItem label="Name" value="AFFM2309 (ECHO) DataSet" />
                    <SummaryItem label="Description" value="-" />
                    <SummaryItem label="Core compentencies" value="EDUCATION, ICLA, WASH" />
                    <SummaryItem label="Linked Project" value="AFFM2309 (ECHO)" />
                    <SummaryItem label="Organisation Units" value="Logar (AF05)" />
                    <SummaryItem label="Countries" value="Afghanistan" />
                </ul>
            </Grid>
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

SummaryDataSet.displayName = "SummaryDataSet";
