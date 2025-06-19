import React from "react";
import { Grid, Typography } from "@material-ui/core";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { component } from "$/utils/react";
import { Code, Id } from "$/domain/entities/Ref";
import styled from "styled-components";
import { toLowercaseString } from "$/utils/ts-utils";

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

    const { missingSelectedCompanion } = useGetMissingSelectedCompanion({ dataSet });

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

                {missingSelectedCompanion.length > 0 && (
                    <SummaryItem label={i18n.t("Companion Indicators")} value="" />
                )}

                {missingSelectedCompanion.map(indicator => (
                    <MissingCompanionAlert indicator={indicator} key={indicator.id} />
                ))}
            </ul>
        </Grid>
    );
});

const MissingCompanionAlert = React.memo((props: { indicator: MissingCompanionIndicator }) => {
    const { indicator } = props;

    const outcomeMessage = indicator.outcomeMessage
        ? i18n.t("Outcome companion rule not satisfied: {{rule}}", {
              rule: indicator.outcomeMessage,
              nsSeparator: false,
              interpolation: { escapeValue: false },
          })
        : undefined;

    const outputMessage = indicator.outputMessage
        ? i18n.t("Output companion rule not satisfied: {{rule}}", {
              rule: indicator.outputMessage,
              nsSeparator: false,
              interpolation: { escapeValue: false },
          })
        : undefined;

    const messages = _([outputMessage, outcomeMessage]).compact().value();

    return (
        <MissingCompanionAlertContainer>
            {messages.map(message => (
                <SummaryItem key={message} label={indicator.code} value={message} />
            ))}
        </MissingCompanionAlertContainer>
    );
});

export const SummaryItem = React.memo((props: { label: string; value: string }) => {
    return (
        <li>
            <strong>{props.label}:</strong> {props.value}
        </li>
    );
});

const useGetMissingSelectedCompanion = (props: { dataSet: DataSet }) => {
    const { dataSet } = props;

    const indicatorByCodes = React.useMemo(
        () =>
            _(dataSet.indicators)
                .filter(indicator => Boolean(indicator.code))
                .keyBy(indicator => toLowercaseString(indicator.code)),
        [dataSet]
    );

    const missingSelectedCompanion = React.useMemo(() => {
        return _(dataSet.indicators)
            .filter(indicator => indicator.getCompanionCodesFromRules().length > 0)
            .compactMap(indicator => {
                const { outcomeRuleIsValid, outputRuleIsValid } =
                    indicator.validateCompanionRules(indicatorByCodes);

                if (outcomeRuleIsValid && outputRuleIsValid) return undefined;

                const { outcomeMessage, outputMessage } = indicator.buildCompanionRuleMessage();

                return {
                    id: indicator.id,
                    name: indicator.name,
                    code: indicator.code,
                    outcomeMessage: !outcomeRuleIsValid ? outcomeMessage : "",
                    outputMessage: !outputRuleIsValid ? outputMessage : "",
                };
            })
            .value();
    }, [dataSet, indicatorByCodes]);

    return { missingSelectedCompanion };
};

type MissingCompanionIndicator = {
    id: Id;
    name: string;
    code: Code;
    outcomeMessage: string;
    outputMessage: string;
};

const MissingCompanionAlertContainer = styled("div")`
    padding-inline: 1rem;
`;
