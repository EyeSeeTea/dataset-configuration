import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { getErrors } from "$/domain/entities/generic/Error";
import { DataSetUtils } from "$/domain/usecases/common/DataSetUtils";
import i18n from "$/utils/i18n";

export class SaveDataSetUseCase {
    private dataSetUtils: DataSetUtils;

    constructor(private dataSetRepository: DataSetRepository) {
        this.dataSetUtils = new DataSetUtils(this.dataSetRepository);
    }

    execute(dataSet: DataSet): FutureData<void> {
        const result = dataSet.validate();

        if (result.length > 0) {
            const errors = getErrors(result);
            return Future.error(new Error(errors.join("\n")));
        }

        return this.validateDataSetName(dataSet).flatMap(dataSetAlreadyExists => {
            if (dataSetAlreadyExists)
                return Future.error(
                    new Error(
                        i18n.t("Data set name already exists: {{dataSetName}}", {
                            nsSeparator: false,
                            dataSetName: dataSet.name,
                        })
                    )
                );

            return this.dataSetRepository.save([dataSet]);
        });
    }

    private validateDataSetName(dataSet: DataSet): FutureData<boolean> {
        return this.dataSetUtils.isDataSetNameDuplicate({
            name: dataSet.name,
            dataSetId: dataSet.id,
        });
    }
}
