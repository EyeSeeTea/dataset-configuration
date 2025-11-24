import { NamedRef } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import { D2ApiAppSettings } from "$/data/repositories/D2ApiAppSettings";
import { Maybe } from "$/utils/ts-utils";
import { UnitDate } from "$/domain/entities/UnitDate";
import rec from "$/domain/entities/generic/Rec";

export const metadataCodes = {
    attributes: {
        group: "DE_IND_GROUP",
        project: "GL_DATASET_PROJECT",
        createdByApp: "GL_CREATED_BY_DATASET_CONFIGURATION",
        inputDates: "GL_INTERVAL_DATES",
        periodDates: "GL_DATASET_PERIOD_DATES",
        outcomeDates: "GL_OUTCOME_DATES",
        outputDates: "GL_OUTPUT_DATES",
        outcomeCompanionIndicator: "GL_OUTCOME_COMPANION_INDICATORS",
        outputCompanionIndicator: "GL_OUTPUT_COMPANION_INDICATORS",
        indicatorMatching: "GL_INDICATOR_MATCHING",
        hideInApp: "Hide in data set app",
    },
    categories: { project: "GL_Project" },
    dataElementGroupSets: {
        coreCompetency: "GL_CoreComp_DEGROUPSET",
        theme: "GL_DETHEME_DEGROUPSET",
        status: "GL_DESTATUS_DEGROUPSET",
        measure: "GL_DEGROUP_Measure",
    },
    dataElementGroups: {
        coreIndicator: "GL_MAND_DEGROUP",
        localIndicator: "GL_Local_DEGROUP",
        donorIndicator: "GL_Donor_DEGROUP",
        outputIndicator: "GL_Output_DEGROUP",
        householdsIndicator: "de_mes_hhs",
        individualsIndicator: "de_mes_ind",
    },
    indicatorGroup: {
        coreIndicator: "Global Indicators (Mandatory)",
        donorIndicator: "Donor Indicators",
        localIndicator: "Local Indicators",
    },
    indicatorGroupSets: { theme: "Theme", status: "Status" },
    orgUnitLevels: { country: "Country" },
    categoryCombination: {
        projectTargetActual: "GL_CATBOMBO_ProjectCCTarAct",
    },
    userGroups: {
        adminNotification: "GL_GlobalAdministrator",
    },
};

const metadataFieldsApp = [
    "attributes",
    "categoryCombos",
    "categories",
    "dataElementGroups",
    "dataElementGroupSets",
    "indicatorGroups",
    "indicatorGroupSets",
    "organisationUnitLevels",
    "userGroups",
] as const;

type MetadataKeyType = (typeof metadataFieldsApp)[number];

export class D2ApiConfig {
    private d2ApiAppSettings: D2ApiAppSettings;
    constructor(private api: D2Api) {
        this.d2ApiAppSettings = new D2ApiAppSettings(this.api);
    }

    get(): FutureData<D2Config> {
        return this.getMetadata();
    }

    private getMetadata(): FutureData<D2Config> {
        return this.d2ApiAppSettings.getMetadataFromSettings().map((settings): D2Config => {
            const { appSettings, metadata } = settings;
            const getOrThrowMetadata = (metadataKey: MetadataKeyType, value: Maybe<string>) =>
                getOrThrow(metadata[metadataKey], value, metadataKey);

            const orgUnitLevel = getOrThrowMetadata(
                "organisationUnitLevels",
                appSettings.countryLevelId
            );
            const orgUnitLevelNumber = metadata.organisationUnitLevels.find(
                level => level.id === orgUnitLevel.id
            );

            return {
                attributes: this.buildAttributes(metadata.attributes),
                categories: {
                    project: getOrThrowMetadata("categories", appSettings.defaultProjectId),
                },
                categoryCombos: {
                    projectTargetActual: getOrThrowMetadata(
                        "categoryCombos",
                        appSettings.categoryComboId
                    ),
                },
                dataElementGroupSets: {
                    coreCompetency: getOrThrowMetadata(
                        "dataElementGroupSets",
                        appSettings.coreCompetencyId
                    ),
                    theme: getOrThrowMetadata(
                        "dataElementGroupSets",
                        appSettings.dataElementThemeId
                    ),
                    status: getOrThrowMetadata(
                        "dataElementGroupSets",
                        appSettings.statusDataElementId
                    ),
                    measure: getOrThrowMetadata(
                        "dataElementGroupSets",
                        metadataCodes.dataElementGroupSets.measure
                    ),
                },
                dataElementGroups: {
                    localIndicator: getOrThrowMetadata(
                        "dataElementGroups",
                        metadataCodes.dataElementGroups.localIndicator
                    ),
                    donorIndicator: getOrThrowMetadata(
                        "dataElementGroups",
                        metadataCodes.dataElementGroups.donorIndicator
                    ),
                    coreIndicator: getOrThrowMetadata(
                        "dataElementGroups",
                        metadataCodes.dataElementGroups.coreIndicator
                    ),
                    outputIndicator: getOrThrowMetadata("dataElementGroups", appSettings.outputId),
                    individualIndicator: getOrThrowMetadata(
                        "dataElementGroups",
                        metadataCodes.dataElementGroups.individualsIndicator
                    ),
                    householdIndicator: getOrThrowMetadata(
                        "dataElementGroups",
                        metadataCodes.dataElementGroups.householdsIndicator
                    ),
                },
                indicatorGroups: {
                    coreIndicator: getOrThrowMetadata(
                        "indicatorGroups",
                        metadataCodes.indicatorGroup.coreIndicator
                    ),
                    donorIndicator: getOrThrowMetadata(
                        "indicatorGroups",
                        metadataCodes.indicatorGroup.donorIndicator
                    ),
                    localIndicator: getOrThrowMetadata(
                        "indicatorGroups",
                        metadataCodes.indicatorGroup.localIndicator
                    ),
                },
                indicatorGroupSets: {
                    theme: getOrThrowMetadata("indicatorGroupSets", appSettings.indicatorThemeId),
                    status: getOrThrowMetadata("indicatorGroupSets", appSettings.statusIndicatorId),
                },
                organisationUnitLevels: {
                    country: { ...orgUnitLevel, level: orgUnitLevelNumber?.level ?? 2 },
                },
                periodEndDateDay: appSettings.periodEndDateDay,
                periodEndDateMonth: appSettings.periodEndDateMonth,
                periodLastYearEndDate: appSettings.periodLastYearEndDate,
                periodLastYearUnits: appSettings.periodLastYearUnits,
                userGroups: {
                    adminNotification: metadata.userGroups.find(
                        userGroup => userGroup.name === metadataCodes.userGroups.adminNotification
                    ),
                },
                outcomeEndDateDay: appSettings.outcomeEndDateDay,
                outcomeEndDateMonth: appSettings.outcomeEndDateMonth,
                outcomeLastYearUnits: appSettings.outcomeLastYearUnits,
                outcomeLastYearValue: appSettings.outcomeLastYearValue,
                outputEndDateDay: appSettings.outputEndDateDay,
                outputEndDateMonth: appSettings.outputEndDateMonth,
                outputLastYearUnits: appSettings.outputLastYearUnits,
                outputLastYearValue: appSettings.outputLastYearValue,
            };
        });
    }

    private buildAttributes(attributes: D2NamedCodeRef[]): D2Config["attributes"] {
        return rec(metadataCodes.attributes)
            .mapValues(([_key, code]) => getOrThrow(attributes, code, "attributes"))
            .value();
    }
}

function getOrThrow(
    modelData: D2NamedCodeRef[],
    value: Maybe<string>,
    metadataKey: MetadataKeyType
): D2NamedCodeRef {
    const model = modelData.find(
        attribute => attribute.code === value || attribute.name === value || attribute.id === value
    );
    if (!model)
        throw new Error(`Metadata object not found: id/name/code="${metadataKey}-${value}"`);

    return model;
}

export type D2Config = {
    userGroups: {
        adminNotification: Maybe<D2NamedCodeRef>;
    };
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    periodLastYearUnits: UnitDate;
    attributes: {
        project: D2NamedCodeRef;
        createdByApp: D2NamedCodeRef;
        group: D2NamedCodeRef;
        inputDates: D2NamedCodeRef;
        periodDates: D2NamedCodeRef;
        outcomeDates: D2NamedCodeRef;
        outputDates: D2NamedCodeRef;
        outcomeCompanionIndicator: D2NamedCodeRef;
        outputCompanionIndicator: D2NamedCodeRef;
        indicatorMatching: D2NamedCodeRef;
        hideInApp: D2NamedCodeRef;
    };
    categories: { project: D2NamedCodeRef };
    categoryCombos: { projectTargetActual: D2NamedCodeRef };
    dataElementGroupSets: {
        coreCompetency: D2NamedCodeRef;
        status: D2NamedCodeRef;
        theme: D2NamedCodeRef;
        measure: D2NamedCodeRef;
    };
    dataElementGroups: {
        coreIndicator: D2NamedCodeRef;
        localIndicator: D2NamedCodeRef;
        donorIndicator: D2NamedCodeRef;
        outputIndicator: D2NamedCodeRef;
        individualIndicator: D2NamedCodeRef;
        householdIndicator: D2NamedCodeRef;
    };
    indicatorGroups: {
        coreIndicator: D2NamedCodeRef;
        localIndicator: D2NamedCodeRef;
        donorIndicator: D2NamedCodeRef;
    };
    indicatorGroupSets: { theme: D2NamedCodeRef; status: D2NamedCodeRef };
    organisationUnitLevels: { country: D2NamedCodeRef & { level: number } };
    outcomeEndDateDay: number;
    outcomeEndDateMonth: number;
    outcomeLastYearUnits: UnitDate;
    outcomeLastYearValue: number;

    outputEndDateDay: number;
    outputEndDateMonth: number;
    outputLastYearUnits: UnitDate;
    outputLastYearValue: number;
};

type D2NamedCodeRef = NamedRef & { code: string };
