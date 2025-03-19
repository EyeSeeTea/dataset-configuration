import { Codec, string, number, optional } from "purify-ts";

const optionalPeriod = optional(Codec.interface({ day: number, month: number }));
const optionalPeriodLastYear = optional(Codec.interface({ units: string, value: number }));

export const D2ApiSettingsCodec = Codec.interface({
    attributeGroupId: string,
    categoryComboId: string,
    categoryProjectsId: string,
    createdByDataSetConfigurationAttributeId: string,
    dataElementGroupGlobalIndicatorMandatoryId: string,
    dataElementGroupOutputId: string,
    dataElementGroupSetCoreCompetencyId: string,
    dataElementGroupSetOriginId: string,
    dataElementGroupSetStatusId: string,
    dataElementGroupSetThemeId: string,
    dataPeriodIntervalDatesAttributeId: string,
    dataPeriodOutcomeDatesAttributeId: string,
    dataPeriodOutputDatesAttributeId: string,
    exclusionRuleCoreUserGroupId: string,
    expiryDays: number,
    hideInDataSetAppAttributeId: string,
    indicatorGroupGlobalIndicatorMandatoryId: string,
    indicatorGroupSetOriginId: string,
    indicatorGroupSetStatusId: string,
    indicatorGroupSetThemeId: string,
    organisationUnitLevelForCountriesId: string,
    periodEndDate: optionalPeriod,
    periodLastYearEndDate: optionalPeriodLastYear,
    dataSetPeriodDateAttribute: string,
});
