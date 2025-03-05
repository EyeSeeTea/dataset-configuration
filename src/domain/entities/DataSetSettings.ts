import { CoreCompetency, DataSet } from "$/domain/entities/DataSet";
import { Indicator } from "$/domain/entities/Indicator";

export type DataSetSettings = {
    dataSet: DataSet;
    coreCompetencies: CoreCompetency[];
    indicators: Indicator[];
    existingIndicatorIds: string[];
};
