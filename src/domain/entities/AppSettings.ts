import { Id } from "$/domain/entities/Ref";
import { DEFAULT_UNIT_DATE } from "$/domain/entities/UnitDate";
import { Struct } from "$/domain/entities/generic/Struct";
import { Maybe } from "$/utils/ts-utils";

export type AppSettingsAttr = {
    defaultProjectId: Maybe<Id>;
    categoryComboId: Maybe<Id>;
    coreCompetencyId: Maybe<Id>;
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    periodLastYearUnits: string;
    countryLevelId: Maybe<Id>;
    dataSetFilterField: Maybe<string>;
    periodDateField: Maybe<string>;
    inputDateField: Maybe<string>;
    dataElementThemeId: Maybe<string>;
    indicatorThemeId: Maybe<string>;
    groupField: Maybe<string>;
    outputId: Maybe<Id>;
    mandatoryDataElementId: Maybe<Id>;
    mandatoryIndicatorId: Maybe<Id>;
    originDataElementId: Maybe<Id>;
    originIndicatorId: Maybe<Id>;
    statusDataElementId: Maybe<Id>;
    statusIndicatorId: Maybe<Id>;
    indicatorHideField: Maybe<Id>;
    userGroupId: Maybe<Id>;
};

export class AppSettings extends Struct<AppSettingsAttr>() {
    static DEFAULT_PERIOD_END_DATE_MONTH = 4;
    static DEFAULT_PERIOD_END_DATE_DAY = 1;

    static initial(): AppSettings {
        return this.create({
            categoryComboId: undefined,
            defaultProjectId: undefined,
            coreCompetencyId: undefined,
            periodEndDateDay: this.DEFAULT_PERIOD_END_DATE_DAY,
            periodEndDateMonth: this.DEFAULT_PERIOD_END_DATE_MONTH,
            periodLastYearEndDate: 0,
            periodLastYearUnits: DEFAULT_UNIT_DATE,
            countryLevelId: undefined,
            dataSetFilterField: undefined,
            periodDateField: undefined,
            inputDateField: undefined,
            dataElementThemeId: undefined,
            indicatorThemeId: undefined,
            groupField: undefined,
            outputId: undefined,
            mandatoryDataElementId: undefined,
            mandatoryIndicatorId: undefined,
            originDataElementId: undefined,
            originIndicatorId: undefined,
            statusDataElementId: undefined,
            statusIndicatorId: undefined,
            indicatorHideField: undefined,
            userGroupId: undefined,
        });
    }
}
