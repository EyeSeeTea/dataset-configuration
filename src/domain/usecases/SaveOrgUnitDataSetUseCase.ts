import { FutureData } from "$/domain/entities/generic/Future";
import { DataSet, DataSetToSave } from "$/domain/entities/DataSet";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import _ from "$/domain/entities/generic/Collection";

export class SaveOrgUnitDataSetUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(options: SaveOrgUnitsOptions): FutureData<void> {
        return this.getDataSetsByIds(options.dataSetsIds).flatMap(dataSets => {
            const dataSetsToSave =
                options.action === "replace" || options.dataSetsIds.length === 1
                    ? this.replaceOrgUnits(dataSets, options.orgUnitsIds)
                    : this.mergeOrgUnits(dataSets, options.orgUnitsIds);
            return this.dataSetRepository.save(dataSetsToSave);
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
