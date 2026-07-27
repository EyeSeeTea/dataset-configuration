import { DataSetPeriodDate } from "$/domain/entities/DataSetPeriodDate";
import { Stats } from "$/domain/entities/Stats";
import { FutureData } from "$/domain/entities/generic/Future";

export interface DataSetPeriodDateRepository {
    getAll(): FutureData<DataSetPeriodDate[]>;
    save(dataSetPeriodDates: DataSetPeriodDate[]): FutureData<Stats[]>;
}
