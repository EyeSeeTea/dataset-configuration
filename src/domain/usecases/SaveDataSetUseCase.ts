import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { Maybe } from "$/utils/ts-utils";
import { getErrors } from "$/domain/entities/generic/Error";

export class SaveDataSetUseCase {
    constructor(private dataSetRepository: DataSetRepository) {}

    execute(dataSet: DataSet): FutureData<void> {
        return this.getDataSetById(dataSet.id).flatMap(existingDataSet => {
            const dataSetToSave = DataSet.create({
                ...(existingDataSet || {}),
                ...dataSet,
                shortName: this.truncateValue(dataSet.name),
            });

            const result = dataSetToSave.validateSetup();
            if (result.isError()) {
                const errors = getErrors(result.value.error);
                return Future.error(new Error(errors.join("\n")));
            }

            return this.dataSetRepository.save([dataSetToSave]);
        });
    }

    private getDataSetById(id: string): FutureData<Maybe<DataSet>> {
        return this.dataSetRepository.getByIds([id]).map(dataSets => {
            return _(dataSets).first();
        });
    }

    private truncateValue(input: string): string {
        const targetLength = 50;
        return input.length > targetLength ? input.slice(0, targetLength) : input;
    }
}
