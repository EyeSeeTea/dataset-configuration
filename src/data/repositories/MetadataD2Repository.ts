import mapValues from "lodash.mapvalues";
import keyBy from "lodash.keyby";
import { D2Api, MetadataPick } from "$/types/d2-api";
import { FutureData, apiToFuture } from "$/data/api-futures";
import { MetadataItem } from "$/domain/entities/MetadataItem";
import { Future } from "$/domain/entities/generic/Future";
import rec from "$/domain/entities/generic/Rec";
import { MetadataRepository } from "$/domain/repositories/MetadataRepository";

const metadataCodes = {
    attributes: {
        project: "GL_DATASET_PROJECT",
        createdByApp: "GL_CREATED_BY_DATASET_CONFIGURATION",
    },
    categories: { project: "GL_Project" },
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
};

export class MetadataD2Repository implements MetadataRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<MetadataItem> {
        return this.getIndexedMetadata().flatMap(metadata => {
            return Future.success(metadata);
        });
    }

    private getIndexedMetadata(): FutureData<MetadataIndexed> {
        const d2Response = this.api.metadata.get(metadataFields);
        return apiToFuture(d2Response).flatMap(metadata => {
            const metadataIndexed = mapValues(metadata, (objs, key: keyof typeof metadata) => {
                const objsByCode = keyBy(objs, obj => obj.code);
                const objsByName = keyBy(objs, obj => obj.name);
                const dictionary = metadataCodes[key];
                return mapValues(dictionary, value => {
                    const obj = objsByCode[value] || objsByName[value];
                    if (!obj) throw Error(`Metadata object not found: ${key}.code/name="${value}"`);
                    return obj;
                });
            });
            return Future.success(metadataIndexed as unknown as MetadataIndexed);
        });
    }
}

type Codes = typeof metadataCodes;
type MetadataRequest = typeof metadataFields;
type MetadataResponse = MetadataPick<MetadataRequest>;
type MetadataIndexed = {
    [K in keyof Codes]: { [K2 in keyof Codes[K]]: MetadataResponse[K][number] };
};
