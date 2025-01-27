import { NamedRef } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import rec from "$/domain/entities/generic/Rec";
import { apiToFuture } from "$/data/api-futures";

export const metadataCodes = {
    attributes: {
        group: "DE_IND_GROUP",
        project: "GL_DATASET_PROJECT",
        createdByApp: "GL_CREATED_BY_DATASET_CONFIGURATION",
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
    },
    indicatorGroup: {
        coreIndicator: "Global Indicators (Mandatory)",
        donorIndicator: "Donor Indicators",
        localIndicator: "Local Indicators",
    },
    indicatorGroupSets: { theme: "Theme", status: "Status" },
    orgUnitLevels: { country: "Country" },
};

const metadataFields = {
    attributes: {
        fields: { id: true, name: true, code: true },
        filter: { identifiable: { in: rec(metadataCodes.attributes).values() } },
    },
    categories: {
        fields: { id: true, name: true, code: true },
        filter: { identifiable: { in: rec(metadataCodes.categories).values() } },
    },
    dataElementGroups: {
        fields: { id: true, name: true, code: true },
        filter: { identifiable: { in: rec(metadataCodes.dataElementGroups).values() } },
    },
    dataElementGroupSets: {
        fields: { id: true, name: true, code: true },
        filter: { identifiable: { in: rec(metadataCodes.dataElementGroupSets).values() } },
    },
    indicatorGroups: {
        fields: { id: true, name: true, code: true },
        filter: { name: { in: rec(metadataCodes.indicatorGroup).values() } },
    },
    indicatorGroupSets: {
        fields: { id: true, name: true, code: true },
        filter: { name: { in: rec(metadataCodes.indicatorGroupSets).values() } },
    },
};

export class D2ApiConfig {
    constructor(private api: D2Api) {}

    get(): FutureData<D2Config> {
        return this.getMetadata();
    }

    private getMetadata(): FutureData<D2Config> {
        return apiToFuture(this.api.metadata.get(metadataFields)).map(d2Response => {
            const getOrThrowMetadata = (metadataKey: keyof typeof metadataFields, code: string) =>
                getOrThrow(d2Response[metadataKey], code);

            return {
                attributes: this.buildAttributes(d2Response.attributes),
                categories: {
                    project: getOrThrowMetadata("categories", metadataCodes.categories.project),
                },
                dataElementGroupSets: {
                    coreCompetency: getOrThrowMetadata(
                        "dataElementGroupSets",
                        metadataCodes.dataElementGroupSets.coreCompetency
                    ),
                    theme: getOrThrowMetadata(
                        "dataElementGroupSets",
                        metadataCodes.dataElementGroupSets.theme
                    ),
                    status: getOrThrowMetadata(
                        "dataElementGroupSets",
                        metadataCodes.dataElementGroupSets.status
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
                    theme: getOrThrowMetadata(
                        "indicatorGroupSets",
                        metadataCodes.indicatorGroupSets.theme
                    ),
                    status: getOrThrowMetadata(
                        "indicatorGroupSets",
                        metadataCodes.indicatorGroupSets.status
                    ),
                },
            };
        });
    }

    private buildAttributes(attributes: D2NamedCodeRef[]): D2Config["attributes"] {
        return {
            group: getOrThrow(attributes, metadataCodes.attributes.group),
            project: getOrThrow(attributes, metadataCodes.attributes.project),
            createdByApp: getOrThrow(attributes, metadataCodes.attributes.createdByApp),
        };
    }
}

function getOrThrow(modelData: D2NamedCodeRef[], code: string): D2NamedCodeRef {
    const model = modelData.find(attribute => attribute.code === code || attribute.name === code);
    if (!model) throw new Error(`Metadata object not found: code="${code}"`);

    return model;
}

export type D2Config = {
    attributes: { project: D2NamedCodeRef; createdByApp: D2NamedCodeRef; group: D2NamedCodeRef };
    categories: { project: D2NamedCodeRef };
    dataElementGroupSets: {
        coreCompetency: D2NamedCodeRef;
        status: D2NamedCodeRef;
        theme: D2NamedCodeRef;
    };
    dataElementGroups: {
        coreIndicator: D2NamedCodeRef;
        localIndicator: D2NamedCodeRef;
        donorIndicator: D2NamedCodeRef;
    };
    indicatorGroups: {
        coreIndicator: D2NamedCodeRef;
        localIndicator: D2NamedCodeRef;
        donorIndicator: D2NamedCodeRef;
    };
    indicatorGroupSets: { theme: D2NamedCodeRef; status: D2NamedCodeRef };
};

type D2NamedCodeRef = NamedRef & { code: string };
