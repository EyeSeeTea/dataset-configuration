import { Future, FutureData } from "$/domain/entities/generic/Future";
import { AccessData, AccessType, DataSet } from "$/domain/entities/DataSet";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { Permission } from "$/domain/entities/Permission";
import { Maybe } from "$/utils/ts-utils";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { UserUtils } from "$/domain/usecases/common/UserUtils";
import { UserRepository } from "$/domain/repositories/UserRepository";

export class SaveSharingDataSetsUseCase {
    private userUtils: UserUtils;
    constructor(
        private dataSetRepository: DataSetRepository,
        private logRepository: LogRepository,
        private userRepository: UserRepository
    ) {
        this.userUtils = new UserUtils(this.userRepository, this.logRepository);
    }

    execute(options: SaveDataSetOptions): FutureData<DataSet[]> {
        const dataSetsIds = options.dataSets.map(dataSet => dataSet.id);
        return this.getDataSetsByIds(dataSetsIds).flatMap(dataSets => {
            return this.userUtils.checkDataSetAccess(dataSets).flatMap(() => {
                const dataSetsWithPermissions = this.setPermissionsToDataSets(dataSets, options);
                return this.dataSetRepository
                    .save(dataSetsWithPermissions)
                    .flatMap(() => {
                        return this.userUtils
                            .logAction({
                                action: "sharing",
                                dataSets: dataSetsWithPermissions,
                                status: "success",
                            })
                            .map(() => dataSetsWithPermissions);
                    })
                    .flatMapError(error => {
                        return this.userUtils
                            .logAction({
                                action: "sharing",
                                dataSets: dataSetsWithPermissions,
                                status: "failed",
                            })
                            .flatMap(() => Future.error(error));
                    });
            });
        });
    }

    private setPermissionsToDataSets(dataSets: DataSet[], options: SaveDataSetOptions) {
        const accessUserData = this.getAccessDataByType("users", options.accessData);
        const accessGroupData = this.getAccessDataByType("groups", options.accessData);
        return dataSets.map(dataSet => {
            const users =
                accessUserData.length > 0
                    ? accessUserData
                    : dataSet.access.filter(access => access.type === "users");

            const groups =
                accessGroupData.length > 0
                    ? accessGroupData
                    : dataSet.access.filter(access => access.type === "groups");

            return DataSet.create({
                ...dataSet,
                access: [...users, ...groups],
                permissions: {
                    data: options.dataPermission || dataSet.permissions.data,
                    metadata: options.metadataPermission || dataSet.permissions.metadata,
                },
            });
        });
    }

    private getAccessDataByType(type: AccessType, access: AccessData[]): AccessData[] {
        return access.filter(access => access.type === type);
    }

    private getDataSetsByIds(ids: string[]): FutureData<DataSet[]> {
        return this.dataSetRepository.getByIds(ids);
    }
}

export type SaveDataSetOptions = {
    dataSets: DataSet[];
    accessData: AccessData[];
    dataPermission: Maybe<Permission>;
    metadataPermission: Maybe<Permission>;
};
