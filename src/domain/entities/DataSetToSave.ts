import { DataSet, DataSetAttrs } from "$/domain/entities/DataSet";
import { Ref } from "$/domain/entities/Ref";

export type DataSetToSaveAttrs = Omit<DataSetAttrs, "orgUnits" | "created" | "lastUpdated"> & {
    orgUnits: Ref[];
};

export class DataSetToSave extends DataSet {}
