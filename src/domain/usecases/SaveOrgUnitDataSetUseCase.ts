import { FutureData } from "$/data/api-futures";
import { DataSet, OrgUnit } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
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

    private replaceOrgUnits(dataSets: DataSet[], orgUnitsIds: Id[]): DataSet[] {
        return dataSets.map(dataSet => {
            return DataSet.create({ ...dataSet, ...this.buildOrgUnit(orgUnitsIds) });
        });
    }

    private mergeOrgUnits(dataSets: DataSet[], orgUnitsIds: Id[]): DataSet[] {
        return dataSets.map(dataSet => {
            return DataSet.create({
                ...dataSet,
                orgUnits: this.mergeAndUniqueOrgUnits(dataSet, orgUnitsIds),
            });
        });
    }

    private mergeAndUniqueOrgUnits(dataSet: DataSet, orgUnitsIds: Id[]): OrgUnit[] {
        return _([...dataSet.orgUnits, ...this.buildOrgUnit(orgUnitsIds)])
            .uniqBy(orgUnit => orgUnit.id)
            .value();
    }

    private buildOrgUnit(orgUnitsIds: Id[]): OrgUnit[] {
        return orgUnitsIds.map(orgUnitId => {
            return { id: orgUnitId, name: "", paths: [] };
        });
    }
}

export type SaveOrgUnitsOptions = {
    dataSetsIds: Id[];
    orgUnitsIds: Id[];
    action: "merge" | "replace";
};
