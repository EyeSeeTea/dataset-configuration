import { DataSetPeriodDate } from "$/domain/entities/DataSetPeriodDate";
import { Stats } from "$/domain/entities/Stats";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataSetPeriodDateRepository } from "$/domain/repositories/DataSetPeriodDateRepository";

export class MigratePeriodDatesUseCase {
    constructor(private periodRepository: DataSetPeriodDateRepository) {}

    execute(): FutureData<Stats[]> {
        console.debug("Fetching dataSets...");
        return this.periodRepository.getAll().flatMap(dataSets => {
            console.debug("DataSets found:", dataSets.length);
            const dataSetPeriodDates = dataSets
                .filter(dataSet => dataSet.outputDate.periods.length > 0)
                .map((dataSet): DataSetPeriodDate => {
                    return {
                        ...dataSet,
                        periodDate: dataSet.outputDate,
                    };
                });
            console.debug("DataSets to update:", dataSetPeriodDates);
            return this.periodRepository.save(dataSetPeriodDates);
        });
    }
}
