import { NamedRef } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import { D2ApiAppSettings } from "$/data/repositories/D2ApiAppSettings";
import { AppSettings } from "$/domain/entities/AppSettings";
import { Maybe } from "$/utils/ts-utils";

export const metadataCodes = {
    attributes: {
        group: "DE_IND_GROUP",
        project: "GL_DATASET_PROJECT",
        createdByApp: "GL_CREATED_BY_DATASET_CONFIGURATION",
        inputDates: "GL_INTERVAL_DATES",
        periodDates: "GL_DATASET_PERIOD_DATES",
        outcomeDates: "GL_OUTCOME_DATES",
        outputDates: "GL_OUTPUT_DATES",
    },
    categories: { project: "GL_Project" },
    dataElementGroupSets: {
        coreCompetency: "GL_CoreComp_DEGROUPSET",
        theme: "GL_DETHEME_DEGROUPSET",
        status: "GL_DESTATUS_DEGROUPSET",
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
        return this.d2ApiAppSettings.getMetadataFromSettings().map(settings => {
            const { appSettings, metadata } = settings;
            const getOrThrowMetadata = (metadataKey: MetadataKeyType, value: Maybe<string>) =>
                getOrThrow(metadata[metadataKey], value);

            const orgUnitLevel = getOrThrowMetadata(
                "organisationUnitLevels",
                appSettings.countryLevelId
            );
            const orgUnitLevelNumber = metadata.organisationUnitLevels.find(
                level => level.id === orgUnitLevel.id
            );

            return {
                attributes: this.buildAttributes(metadata.attributes, appSettings),
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
            };
        });
    }

    private buildAttributes(
        attributes: D2NamedCodeRef[],
        appSettings: AppSettings
    ): D2Config["attributes"] {
        return {
            group: getOrThrow(attributes, appSettings.groupField),
            project: getOrThrow(attributes, metadataCodes.attributes.project),
            createdByApp: getOrThrow(attributes, appSettings.dataSetFilterField),
            inputDates: getOrThrow(attributes, appSettings.inputDateField),
            periodDates: getOrThrow(attributes, appSettings.periodDateField),
            outcomeDates: getOrThrow(attributes, metadataCodes.attributes.outcomeDates),
            outputDates: getOrThrow(attributes, metadataCodes.attributes.outputDates),
        };
    }
}

function getOrThrow(modelData: D2NamedCodeRef[], value: Maybe<string>): D2NamedCodeRef {
    const model = modelData.find(
        attribute => attribute.code === value || attribute.name === value || attribute.id === value
    );
    if (!model) throw new Error(`Metadata object not found: code="${value}"`);

    return model;
}

export type D2Config = {
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    periodLastYearUnits: string;
    attributes: {
        project: D2NamedCodeRef;
        createdByApp: D2NamedCodeRef;
        group: D2NamedCodeRef;
        inputDates: D2NamedCodeRef;
        periodDates: D2NamedCodeRef;
        outcomeDates: D2NamedCodeRef;
        outputDates: D2NamedCodeRef;
    };
    categories: { project: D2NamedCodeRef };
    categoryCombos: { projectTargetActual: D2NamedCodeRef };
    dataElementGroupSets: {
        coreCompetency: D2NamedCodeRef;
        status: D2NamedCodeRef;
        theme: D2NamedCodeRef;
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
};

type D2NamedCodeRef = NamedRef & { code: string };
