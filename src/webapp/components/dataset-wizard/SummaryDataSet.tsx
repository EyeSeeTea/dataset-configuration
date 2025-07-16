import React from "react";
import { Grid, Typography } from "@material-ui/core";
import capitalize from "lodash/capitalize";

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
    const requiredScope = Indicator.buildCompanionScope(
        dataSet.project?.startDate ? new Date(dataSet.project.startDate) : undefined
    );

    const { missingSelectedCompanion } = useGetMissingSelectedCompanion({ dataSet, requiredScope });

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
                            requiredScope={requiredScope}
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

        const companionIndicatorTypes = indicator.keys();

        const allAllValid = indicator
            .values()
            .every(item => item.every(validation => validation.isValid));

        if (allAllValid) {
            return (
                <MissingCompanionAlertContainer>
                    <strong>{i18n.t("All companions are satisfied")}</strong>
                </MissingCompanionAlertContainer>
            );
        }

        return (
            <MissingCompanionAlertContainer>
                <strong>
                    <span>
                        {requiredScope} ({i18n.t("These companion rules need to be satisfied")})
                    </span>
                </strong>
                {companionIndicatorTypes.map(type => (
                    <>
                        <ul>
                            <li>
                                <span>{capitalize(type)}:</span>
                                <ul key={type}>
                                    {indicator.get(type)?.map((validationMessage, index) => (
                                        <SummaryItem
                                            label={validationMessage.code}
                                            value={validationMessage.message}
                                            key={index}
                                        />
                                    ))}
                                </ul>
                            </li>
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

const useGetMissingSelectedCompanion = (props: { dataSet: DataSet; requiredScope: string }) => {
    const { dataSet, requiredScope } = props;

    const indicatorByCodes = React.useMemo(
        () =>
            _(dataSet.indicators)
                .filter(indicator => Boolean(indicator.code))
                .keyBy(indicator => toLowercaseString(indicator.code)),
        [dataSet]
    );

    const missingSelectedCompanion: Maybe<MissingCompanionIndicator> = React.useMemo(() => {
        const scopeIndicatorValidations = _(dataSet.indicators)
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
            .flatten()
            .filter(validation => validation.scope === requiredScope);

        return scopeIndicatorValidations
            .groupBy(validation => validation.type)
            .mapValues(([_scope, validations]) =>
                validations.map(validation => ({
                    code: validation.code,
                    message: validation.message,
                    isValid: validation.isValid,
                }))
            );
    }, [dataSet, indicatorByCodes, requiredScope]);

    if (missingSelectedCompanion.values().length > 0) {
        return { missingSelectedCompanion };
    } else {
        return { missingSelectedCompanion: undefined };
    }
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
            message: buildValidationMessages(isValid, companionRulesMessage.get(scope)),
        })
    );
}

function buildValidationMessages(isValid: boolean, message: Maybe<string>) {
    const allRulesSatisfied = i18n.t("All rules are satisfied");
    return isValid ? allRulesSatisfied : `${i18n.t("Rules not satisfied")}: ${message}`;
}

type CompanionRuleType = "outcomes" | "outputs";

type ValidationItem = {
    code: string;
    scope: IndicatorCompanionScope;
    type: CompanionRuleType;
    isValid: boolean;
    message: string;
};

type ValidationMessage = Pick<ValidationItem, "code" | "message" | "isValid">;

type MissingCompanionIndicator = HashMap<CompanionRuleType, ValidationMessage[]>;

const MissingCompanionAlertContainer = styled("div")`
    padding-inline: 1rem;
`;
