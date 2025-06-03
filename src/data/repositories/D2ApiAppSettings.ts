import { apiToFuture } from "$/data/api-futures";
import { AppSettings } from "$/domain/entities/AppSettings";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { D2Api, DataStore } from "$/types/d2-api";
import { Maybe } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";
import { metadataCodes } from "$/data/repositories/D2ApiMetadata";
import { D2ApiSettingsCodec } from "$/data/ApiSettingsCodec";
import { UnitDate } from "$/domain/entities/UnitDate";

export const APP_NAMESPACE = "dataset-configuration";

export class D2ApiAppSettings {
    private dataStore: DataStore;
    private settingsKey: string;
    constructor(private api: D2Api) {
        this.settingsKey = "settings";
        this.dataStore = this.api.dataStore(APP_NAMESPACE);
    }

    get(): FutureData<AppSettings> {
        return this.getContent().map(response => {
            if (!response) return AppSettings.initial();
            return AppSettings.create({
                defaultProjectId: response.categoryProjectsId,
                categoryComboId: response.categoryComboId,
                coreCompetencyId: response.dataElementGroupSetCoreCompetencyId,
                periodEndDateDay:
                    response.periodEndDate?.day ?? AppSettings.DEFAULT_PERIOD_END_DATE_DAY,
                periodEndDateMonth:
                    response.periodEndDate?.month ?? AppSettings.DEFAULT_PERIOD_END_DATE_MONTH,
                periodLastYearEndDate: response.periodLastYearEndDate?.value ?? 0,
                periodLastYearUnits: response.periodLastYearEndDate?.units ?? "month",
                countryLevelId: response.organisationUnitLevelForCountriesId,
                dataSetFilterField: response.createdByDataSetConfigurationAttributeId,
                periodDateField: response.dataSetPeriodDateAttribute,
                inputDateField: response.dataPeriodIntervalDatesAttributeId,
                dataElementThemeId: response.dataElementGroupSetThemeId,
                indicatorThemeId: response.indicatorGroupSetThemeId,
                groupField: response.attributeGroupId,
                outputId: response.dataElementGroupOutputId,
                mandatoryDataElementId: response.dataElementGroupGlobalIndicatorMandatoryId,
                mandatoryIndicatorId: response.indicatorGroupGlobalIndicatorMandatoryId,
                originDataElementId: response.dataElementGroupSetOriginId,
                originIndicatorId: response.indicatorGroupSetOriginId,
                statusDataElementId: response.dataElementGroupSetStatusId,
                statusIndicatorId: response.indicatorGroupSetStatusId,
                indicatorHideField: response.hideInDataSetAppAttributeId,
                userGroupId: response.exclusionRuleCoreUserGroupId,
            });
        });
    }

    save(appSettings: AppSettings): FutureData<void> {
        return this.getContent().flatMap(existingData => {
            const d2Settings = this.mapToD2Settings(appSettings);
            const settingsToSave = { ...(existingData || {}), ...d2Settings };
            return apiToFuture(this.dataStore.save(this.settingsKey, settingsToSave));
        });
    }

    getMetadataFromSettings() {
        const compactValues = (values: Maybe<string>[]) => _(values).compact().value();

        return this.get().flatMap(appSettings => {
            return apiToFuture(
                this.api.metadata.get({
                    attributes: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([
                                    appSettings.dataSetFilterField,
                                    appSettings.groupField,
                                    appSettings.inputDateField,
                                    appSettings.periodDateField,
                                    appSettings.indicatorHideField,
                                    // used for scripts to migrate data
                                    // not necessary to be configurable in the app through settings
                                    metadataCodes.attributes.outcomeDates,
                                    metadataCodes.attributes.outputDates,
                                    metadataCodes.attributes.project,
                                    metadataCodes.attributes.outputCompanionIndicator,
                                    metadataCodes.attributes.outcomeCompanionIndicator,
                                ]),
                            },
                        },
                    },
                    categoryCombos: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([appSettings.categoryComboId]),
                            },
                        },
                    },
                    organisationUnitLevels: {
                        fields: { id: true, name: true, code: true, level: true },
                        filter: {
                            identifiable: { in: compactValues([appSettings.countryLevelId]) },
                        },
                    },
                    categories: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([appSettings.defaultProjectId]),
                            },
                        },
                    },
                    dataElementGroupSets: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([
                                    appSettings.coreCompetencyId,
                                    appSettings.dataElementThemeId,
                                    appSettings.originDataElementId,
                                    appSettings.statusDataElementId,
                                    metadataCodes.dataElementGroupSets.measure,
                                ]),
                            },
                        },
                    },
                    dataElementGroups: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([
                                    appSettings.mandatoryDataElementId,
                                    appSettings.outputId,
                                    appSettings.dataElementThemeId,
                                    metadataCodes.dataElementGroups.localIndicator,
                                    metadataCodes.dataElementGroups.donorIndicator,
                                    metadataCodes.dataElementGroups.individualsIndicator,
                                    metadataCodes.dataElementGroups.householdsIndicator,
                                ]),
                            },
                        },
                    },
                    indicatorGroupSets: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([
                                    appSettings.indicatorThemeId,
                                    appSettings.originIndicatorId,
                                    appSettings.statusIndicatorId,
                                ]),
                            },
                        },
                    },
                    indicatorGroups: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: {
                                in: compactValues([
                                    appSettings.mandatoryIndicatorId,
                                    metadataCodes.indicatorGroup.donorIndicator,
                                    metadataCodes.indicatorGroup.localIndicator,
                                ]),
                            },
                        },
                    },
                    userGroups: {
                        fields: { id: true, name: true, code: true },
                        filter: {
                            identifiable: { in: [metadataCodes.userGroups.adminNotification] },
                        },
                    },
                })
            ).map(metadata => {
                return { appSettings, metadata };
            });
        });
    }

    private getContent(): FutureData<Maybe<D2ApiSettingsAttrs>> {
        return apiToFuture(this.dataStore.get<D2ApiSettingsAttrs>(this.settingsKey)).flatMap(
            d2Response => {
                if (!d2Response) return Future.success(undefined);
                const codecResult = D2ApiSettingsCodec.decode(d2Response);
                const value = codecResult.leftOrDefault("");
                if (value) {
                    console.error("Error decoding D2ApiSettings", value);
                    return Future.error(new Error("Error decoding D2ApiSettings"));
                } else {
                    return Future.success(d2Response);
                }
            }
        );
    }

    private mapToD2Settings(appSettings: AppSettings) {
        return {
            attributeGroupId: appSettings.groupField,
            categoryComboId: appSettings.categoryComboId,
            categoryProjectsId: appSettings.defaultProjectId,
            createdByDataSetConfigurationAttributeId: appSettings.dataSetFilterField,
            dataElementGroupGlobalIndicatorMandatoryId: appSettings.mandatoryDataElementId,
            dataElementGroupOutputId: appSettings.outputId,
            dataElementGroupSetCoreCompetencyId: appSettings.coreCompetencyId,
            dataElementGroupSetOriginId: appSettings.originDataElementId,
            dataElementGroupSetStatusId: appSettings.statusDataElementId,
            dataElementGroupSetThemeId: appSettings.dataElementThemeId,
            dataPeriodIntervalDatesAttributeId: appSettings.inputDateField,
            exclusionRuleCoreUserGroupId: appSettings.userGroupId,
            hideInDataSetAppAttributeId: appSettings.indicatorHideField,
            indicatorGroupGlobalIndicatorMandatoryId: appSettings.mandatoryIndicatorId,
            indicatorGroupSetOriginId: appSettings.originIndicatorId,
            indicatorGroupSetStatusId: appSettings.statusIndicatorId,
            indicatorGroupSetThemeId: appSettings.indicatorThemeId,
            organisationUnitLevelForCountriesId: appSettings.countryLevelId,
            periodEndDate: {
                day: appSettings.periodEndDateDay,
                month: appSettings.periodEndDateMonth,
            },
            periodLastYearEndDate: {
                units: appSettings.periodLastYearUnits,
                value: appSettings.periodLastYearEndDate,
            },
            dataSetPeriodDateAttribute: appSettings.periodDateField,
        };
    }
}

type D2ApiSettingsAttrs = {
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
    periodEndDate: Maybe<{ day: number; month: number }>;
    periodLastYearEndDate: Maybe<{ units: UnitDate; value: number }>;
    dataSetPeriodDateAttribute: string;
};
