import { NamedRef } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import rec from "$/domain/entities/generic/Rec";
import { apiToFuture } from "$/data/api-futures";

export const metadataCodes = {
    attributes: {
        project: "GL_DATASET_PROJECT",
        createdByApp: "GL_CREATED_BY_DATASET_CONFIGURATION",
    },
    categories: { project: "GL_Project" },
    dataElementGroupSets: { coreCompetency: "GL_CoreComp_DEGROUPSET" },
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
    dataElementGroupSets: {
        fields: { id: true, name: true, code: true },
        filter: { identifiable: { in: rec(metadataCodes.dataElementGroupSets).values() } },
    },
};

export class D2ApiConfig {
    constructor(private api: D2Api) {}

    get(): FutureData<D2Config> {
        return this.getMetadata();
    }

    private getMetadata(): FutureData<D2Config> {
        return apiToFuture(this.api.metadata.get(metadataFields)).map(d2Response => {
            return {
                attributes: this.buildAttributes(d2Response.attributes),
                categories: {
                    project: getOrThrow(d2Response.categories, metadataCodes.categories.project),
                },
                dataElementGroupSets: {
                    coreCompetency: getOrThrow(
                        d2Response.dataElementGroupSets,
                        metadataCodes.dataElementGroupSets.coreCompetency
                    ),
                },
            };
        });
    }

    private buildAttributes(attributes: D2NamedCodeRef[]): D2Config["attributes"] {
        return {
            project: getOrThrow(attributes, metadataCodes.attributes.project),
            createdByApp: getOrThrow(attributes, metadataCodes.attributes.createdByApp),
        };
    }
}

function getOrThrow(modelData: D2NamedCodeRef[], code: string): D2NamedCodeRef {
    const model = modelData.find(attribute => attribute.code === code);
    if (!model) throw new Error(`Metadata object not found: code="${code}"`);

    return model;
}

export type D2Config = {
    attributes: { project: D2NamedCodeRef; createdByApp: D2NamedCodeRef };
    categories: { project: D2NamedCodeRef };
    dataElementGroupSets: { coreCompetency: D2NamedCodeRef };
};

type D2NamedCodeRef = NamedRef & { code: string };
