import { MetadataItem } from "$/domain/entities/MetadataItem";
import { FutureData } from "$/data/api-futures";

export interface MetadataRepository {
    get(): FutureData<MetadataItem>;
}
