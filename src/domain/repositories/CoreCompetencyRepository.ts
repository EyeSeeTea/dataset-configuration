import { CoreCompetency } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";

export interface CoreCompetencyRepository {
    getAll(): FutureData<CoreCompetency[]>;
}
