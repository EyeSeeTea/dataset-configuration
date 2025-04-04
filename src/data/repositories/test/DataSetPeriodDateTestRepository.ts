import { DataSetPeriodDate } from "$/domain/entities/DataSetPeriodDate";
import { Stats } from "$/domain/entities/Stats";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetPeriodDateRepository } from "$/domain/repositories/DataSetPeriodDateRepository";

export class DataSetPeriodDateTestRepository implements DataSetPeriodDateRepository {
    getAll(): FutureData<DataSetPeriodDate[]> {
        throw new Error("Method not implemented.");
    }
    save(_dataSetPeriodDates: DataSetPeriodDate[]): FutureData<Stats[]> {
        throw new Error("Method not implemented.");
    }
}
