import { DataSetList } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { UserRepository } from "$/domain/repositories/UserRepository";
import { UserUtils } from "$/domain/usecases/common/UserUtils";

export class RemoveDataSetsUseCase {
    private userUtils: UserUtils;
    constructor(
        private dataSetRepository: DataSetRepository,
        private userRepository: UserRepository,
        private logRepository: LogRepository
    ) {
        this.userUtils = new UserUtils(this.userRepository, this.logRepository);
    }

    execute(ids: Id[]): FutureData<void> {
        return this.getDataSetByIds(ids).flatMap(dataSets => {
            return this.dataSetRepository
                .delete(ids)
                .flatMap(() => {
                    return this.userUtils
                        .logAction({
                            dataSets: dataSets,
                            status: "success",
                            action: "delete",
                        })
                        .toVoid();
                })
                .flatMapError(error => {
                    return this.userUtils
                        .logAction({
                            dataSets: dataSets,
                            status: "failed",
                            action: "delete",
                        })
                        .flatMap(() => Future.error(error));
                });
        });
    }

    private getDataSetByIds(ids: Id[]): FutureData<DataSetList[]> {
        return this.dataSetRepository
            .getList({
                filters: { ids },
                paging: { page: 1, pageSize: ids.length },
                sorting: {
                    field: "name",
                    order: "desc",
                },
            })
            .map(dataSets => dataSets.data);
    }
}
