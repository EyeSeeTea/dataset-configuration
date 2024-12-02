import { Struct } from "$/domain/entities/generic/Struct";

export type AppSettingsAttrs = {
    attributeGroupId: string;
    categoryComboId: string;
    categoryProjectsId: string;
    createdByDataSetConfigurationAttributeId: string;
    dataElementGroupGlobalIndicatorMandatoryId: string;
    dataElementGroupOutputId: string;
    dataElementGroupSetCoreCompetencyId: string;
    dataElementGroupSetOriginId: string;
    dataElementGroupSetStatusId: string;
    dataElementGroupSetThemeId: string;
    dataPeriodIntervalDatesAttributeId: string;
    dataPeriodOutcomeDatesAttributeId: string;
    dataPeriodOutputDatesAttributeId: string;
    exclusionRuleCoreUserGroupId: string;
    expiryDays: number;
    hideInDataSetAppAttributeId: string;
    indicatorGroupGlobalIndicatorMandatoryId: string;
    indicatorGroupSetOriginId: string;
    indicatorGroupSetStatusId: string;
    indicatorGroupSetThemeId: string;
    organisationUnitLevelForCountriesId: string;
    outcomeEndDate: {
        day: number;
        month: number;
    };
    outcomeLastYearEndDate: {
        units: string;
        value: number;
    };
    outputEndDate: {
        day: number;
        month: number;
    };
    outputLastYearEndDate: {
        units: string;
        value: number;
    };
};

export class AppSettings extends Struct<AppSettingsAttrs>() {}
