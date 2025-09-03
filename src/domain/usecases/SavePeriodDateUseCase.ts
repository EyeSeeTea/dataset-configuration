import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSet } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import _ from "$/domain/entities/generic/Collection";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { UserUtils } from "$/domain/usecases/common/UserUtils";
import { UserRepository } from "$/domain/repositories/UserRepository";
import { DatePeriod } from "$/domain/entities/DatePeriod";

export class SavePeriodDateUseCase {
    private userUtils: UserUtils;
    constructor(
        private dataSetRepository: DataSetRepository,
        private userRepository: UserRepository,
        private logRepository: LogRepository
    ) {
        this.userUtils = new UserUtils(this.userRepository, this.logRepository);
    }

    execute(options: SavePeriodDateOptions): FutureData<void> {
        return this.getDataSetsByIds(options.dataSetsIds).flatMap(dataSets => {
            return this.userUtils.checkDataSetAccess(dataSets).flatMap(() => {
                const dataSetsToSave = dataSets.map(dataSet => {
                    return DataSet.create({
                        ...dataSet,
                        periodDate: options.periodDate,
                        openFuturePeriods: DatePeriod.getFuturePeriods(options.periodDate.endDate),
                    });
                });
                return this.dataSetRepository
                    .save(dataSetsToSave)
                    .flatMap(() => {
                        return this.userUtils
                            .logAction({
                                dataSets: dataSetsToSave,
                                status: "success",
                                action: "period_dates",
                            })
                            .toVoid();
                    })
                    .flatMapError(error => {
                        return this.userUtils
                            .logAction({
                                dataSets: dataSetsToSave,
                                status: "failed",
                                action: "period_dates",
                            })
                            .flatMap(() => Future.error(error));
                    });
            });
        });
    }

    private getDataSetsByIds(ids: string[]): FutureData<DataSet[]> {
        return this.dataSetRepository.getByIds(ids);
    }
}

export type SavePeriodDateOptions = { dataSetsIds: Id[]; periodDate: DatePeriod };
