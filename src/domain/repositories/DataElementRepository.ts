import { DataElement } from "$/domain/entities/DataElement";
import { FutureData } from "$/domain/entities/generic/Future";

export interface DataElementRepository {
    getBy(identifiables: string[]): FutureData<DataElement[]>;
}
