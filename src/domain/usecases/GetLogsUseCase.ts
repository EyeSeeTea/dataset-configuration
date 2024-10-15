import { FutureData } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { GetLogsOptions, LogRepository } from "$/domain/repositories/LogRepository";

export class GetLogsUseCase {
    constructor(
        private dataSetRepository: DataSetRepository,
        private logsRepository: LogRepository
    ) {}

    execute(options: GetLogsOptions): FutureData<Log[]> {
        return this.dataSetRepository.getByIds(options.dataSetsIds).flatMap(dataSets => {
            const ids = dataSets.map(dataSet => dataSet.id);
            return this.logsRepository
                .getByDataSets({ dataSetsIds: ids })
                .map(logs => Log.buildLogsWithDataSetDetails(dataSets, logs));
        });
    }
}
