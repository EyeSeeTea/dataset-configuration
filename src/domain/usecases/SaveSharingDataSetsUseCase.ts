import { ShareUpdate } from "@eyeseetea/d2-ui-components";

import { FutureData } from "$/data/api-futures";
import { AccessData, DataSet } from "$/domain/entities/DataSet";
import { OctalNotationPermission } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { NO_ACCESS_NOTATION, Permission } from "$/domain/entities/Permission";

export class SaveSharingDataSetsUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: SaveDataSetOptions): FutureData<DataSet[]> {
        const { publicAccess, userAccesses, userGroupAccesses } = options.shareUpdate;
        const dataSetsIds = options.dataSets.map(dataSet => dataSet.id);
        return this.getDataSetsByIds(dataSetsIds).flatMap(dataSets => {
            const dataSetsWithPermissions = dataSets.map(dataSet => {
                const users = userAccesses
                    ? userAccesses.map((user): AccessData => {
                          return {
                              id: user.id,
                              name: user.displayName,
                              type: "users",
                              value: user.access,
                          };
                      })
                    : dataSet.access.filter(access => access.type === "users");

                const groups = userGroupAccesses
                    ? userGroupAccesses.map((user): AccessData => {
                          return {
                              id: user.id,
                              name: user.displayName,
                              type: "groups",
                              value: user.access,
                          };
                      })
                    : dataSet.access.filter(access => access.type === "groups");

                return DataSet.create({
                    ...dataSet,
                    access: [...users, ...groups],
                    dataPermissions: publicAccess
                        ? this.buildDataPermissions(publicAccess, "data")
                        : dataSet.dataPermissions,
                    metadataPermissions: publicAccess
                        ? this.buildDataPermissions(publicAccess, "metadata")
                        : dataSet.metadataPermissions,
                });
            });

            return this.dataSetRepository
                .save(dataSetsWithPermissions)
                .map(() => dataSetsWithPermissions);
        });
    }

    private getDataSetsByIds(ids: string[]): FutureData<DataSet[]> {
        return this.dataSetRepository.getByIds(ids);
    }

    private buildDataPermissions(
        value: OctalNotationPermission,
        permissionType: "data" | "metadata"
    ): Permission {
        if (value === NO_ACCESS_NOTATION) {
            return { canRead: false, canWrite: false, noAccess: true };
        }
        const initialIndex = permissionType === "metadata" ? 0 : 2;
        const canRead = value[initialIndex] === "r";
        const canWrite = value[initialIndex + 1] === "w";
        return { canRead, canWrite, noAccess: false };
    }
}

export type SaveDataSetOptions = {
    dataSets: DataSet[];
    shareUpdate: ShareUpdate;
};
