import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSet } from "$/domain/entities/DataSet";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import _ from "$/domain/entities/generic/Collection";
import { DataSetToSave } from "$/domain/entities/DataSetToSave";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { UserUtils } from "$/domain/usecases/common/UserUtils";
import { UserRepository } from "$/domain/repositories/UserRepository";

export class SaveOrgUnitDataSetUseCase {
    private userUtils: UserUtils;
    constructor(
        private dataSetRepository: DataSetRepository,
        private userRepository: UserRepository,
        private logRepository: LogRepository
    ) {
        this.userUtils = new UserUtils(this.userRepository, this.logRepository);
    }

    execute(options: SaveOrgUnitsOptions): FutureData<void> {
        return this.getDataSetsByIds(options.dataSetsIds).flatMap(dataSets => {
            return this.userUtils.checkDataSetAccess(dataSets).flatMap(() => {
                const dataSetsToSave =
                    options.action === "replace" || options.dataSetsIds.length === 1
                        ? this.replaceOrgUnits(dataSets, options.orgUnitsIds)
                        : this.mergeOrgUnits(dataSets, options.orgUnitsIds);
                return this.dataSetRepository
                    .save(dataSetsToSave)
                    .flatMap(() => {
                        return this.userUtils
                            .logAction({
                                dataSets: dataSetsToSave,
                                status: "success",
                                action: "orgunits",
                            })
                            .toVoid();
                    })
                    .flatMapError(error => {
                        return this.userUtils
                            .logAction({
                                dataSets: dataSetsToSave,
                                status: "failed",
                                action: "orgunits",
                            })
                            .flatMap(() => Future.error(error));
                    });
            });
        });
    }

    private getDataSetsByIds(ids: string[]): FutureData<DataSet[]> {
        return this.dataSetRepository.getByIds(ids);
    }

    private replaceOrgUnits(dataSets: DataSet[], orgUnitsIds: Id[]): DataSetToSave[] {
        return dataSets.map(dataSet => {
            return dataSet.setOrgUnits(this.buildOrgUnit(orgUnitsIds));
        });
    }

    private mergeOrgUnits(dataSets: DataSet[], orgUnitsIds: Id[]): DataSetToSave[] {
        return dataSets.map(dataSet => {
            return dataSet.setOrgUnits(this.mergeAndUniqueOrgUnits(dataSet, orgUnitsIds));
        });
    }

    private mergeAndUniqueOrgUnits(dataSet: DataSet, orgUnitsIds: Id[]): Ref[] {
        const existingIds = dataSet.orgUnits.map(orgUnit => ({ id: orgUnit.id }));
        return _(existingIds.concat(this.buildOrgUnit(orgUnitsIds)))
            .uniqBy(orgUnit => orgUnit.id)
            .value();
    }

    private buildOrgUnit(orgUnitsIds: Id[]): Ref[] {
        return orgUnitsIds.map((orgUnitId): Ref => {
            return { id: orgUnitId };
        });
    }
}

export type SaveOrgUnitsOptions = {
    dataSetsIds: Id[];
    orgUnitsIds: Id[];
    action: "merge" | "replace";
};
