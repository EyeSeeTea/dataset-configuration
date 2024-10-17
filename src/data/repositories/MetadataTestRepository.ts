import { FutureData } from "$/data/api-futures";
import { MetadataRepository } from "$/domain/repositories/MetadataRepository";
import { MetadataItem } from "$/domain/entities/MetadataItem";

export class MetadataTestRepository implements MetadataRepository {
    get(): FutureData<MetadataItem> {
        throw new Error("Method not implemented.");
    }
}
