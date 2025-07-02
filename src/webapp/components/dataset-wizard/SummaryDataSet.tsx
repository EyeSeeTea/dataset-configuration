import React from "react";
import { Grid, Typography } from "@material-ui/core";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { component } from "$/utils/react";
import styled from "styled-components";
import { Maybe, toLowercaseString } from "$/utils/ts-utils";
import { HashMap } from "$/domain/entities/generic/HashMap";
import {
    CompanionScopedResult,
    Indicator,
    IndicatorCompanionScope,
} from "$/domain/entities/Indicator";

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

                {missingSelectedCompanion && (
                    <>
                        <SummaryItem label={i18n.t("Companion Indicators")} value="" />
                        <MissingCompanionAlert
                            indicator={missingSelectedCompanion}
                            requiredScope={Indicator.getIndicatorScope(dataSet.project?.startDate)}
                        />
                    </>
                )}
            </ul>
        </Grid>
    );
});

const MissingCompanionAlert = React.memo(
    (props: { indicator: MissingCompanionIndicator; requiredScope: string }) => {
        const { indicator, requiredScope } = props;

        const scopes = indicator.keys();

        const scopeText = React.useCallback(
            (scope: string) => {
                return scope === requiredScope && scope !== "default" ? (
                    <strong>
                        <span>{scope}</span> ({i18n.t("The companion rules for this year need to be satisfied")}):
                    </strong>
                ) : (
                    <span>{scope}</span>
                );
            },
            [requiredScope]
        );

        if (scopes.length === 1) {
            const validationMessages = indicator.get(scopes[0] || "");
            return (
                validationMessages && (
                    <MissingCompanionAlertContainer>
                        {validationMessages?.map((validationMessage, index) => (
                            <SummaryItem
                                label={validationMessage.code}
                                value={validationMessage.message}
                                key={index}
                            />
                        ))}
                    </MissingCompanionAlertContainer>
                )
            );
        }

        return (
            <MissingCompanionAlertContainer>
                {scopes.map(scope => (
                    <>
                        {scopeText(scope)}
                        <ul key={scope}>
                            {indicator.get(scope)?.map((validationMessage, index) => (
                                <SummaryItem
                                    label={validationMessage.code}
                                    value={validationMessage.message}
                                    key={index}
                                />
                            ))}
                        </ul>
                    </>
                ))}
            </MissingCompanionAlertContainer>
        );
    }
);

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

    const missingSelectedCompanion: Maybe<MissingCompanionIndicator> = React.useMemo(() => {
        const allIndicatorValidations = _(dataSet.indicators)
            .filter(indicator => indicator.getAllCompanionCodesFromRules().length > 0)
            .map(indicator => {
                const { outcomeRulesValid, outputRulesValid } =
                    indicator.validateCompanionRules(indicatorByCodes);

                const { outcomeMessages, outputMessages } = indicator.buildCompanionRuleMessage();

                return [
                    ...buildValidationItemsByType({
                        companionRulesValid: outcomeRulesValid,
                        companionRulesMessage: outcomeMessages,
                        code: indicator.code,
                        type: "outcomes",
                    }),
                    ...buildValidationItemsByType({
                        companionRulesValid: outputRulesValid,
                        companionRulesMessage: outputMessages,
                        code: indicator.code,
                        type: "outputs",
                    }),
                ];
            })
            .flatten();

        const areAllValid = allIndicatorValidations.every(validation => validation.isValid);
        if (areAllValid) return undefined;

        return allIndicatorValidations
            .groupBy(validation => validation.scope)
            .mapValues(([_scope, validations]) =>
                validations.map(validation => ({
                    code: validation.code,
                    message: validation.message,
                }))
            );
    }, [dataSet, indicatorByCodes]);

    return { missingSelectedCompanion };
};

function buildValidationItemsByType(props: {
    companionRulesValid: CompanionScopedResult<boolean>;
    companionRulesMessage: CompanionScopedResult<string>;
    code: string;
    type: "outcomes" | "outputs";
}): ValidationItem[] {
    const { companionRulesValid, companionRulesMessage, code, type } = props;
    return companionRulesValid.toPairs().map(
        ([scope, isValid]): ValidationItem => ({
            code: code,
            scope,
            type: type,
            isValid,
            message: buildValidationMessages(isValid, companionRulesMessage.get(scope), "outcomes"),
        })
    );
}

function buildValidationMessages(
    isValid: boolean,
    message: Maybe<string>,
    type: "outcomes" | "outputs"
) {
    const prefix =
        type === "outcomes"
            ? i18n.t("Outcome companion rule not satisfied")
            : i18n.t("Output companion rule not satisfied");
    const allRulesSatisfied = i18n.t("All rules satisfied");
    return isValid ? allRulesSatisfied : `${prefix}: ${message}`;
}

type ValidationItem = {
    code: string;
    scope: IndicatorCompanionScope;
    type: "outcomes" | "outputs";
    isValid: boolean;
    message: string;
};

type ValidationMessage = Pick<ValidationItem, "code" | "message">;

type MissingCompanionIndicator = HashMap<IndicatorCompanionScope, Maybe<ValidationMessage[]>>;

const MissingCompanionAlertContainer = styled("div")`
    padding-inline: 1rem;
`;
