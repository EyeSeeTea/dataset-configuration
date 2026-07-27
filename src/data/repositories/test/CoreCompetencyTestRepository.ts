import { CoreCompetency } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";

export class CoreCompetencyTestRepository implements CoreCompetencyRepository {
    getAll(): FutureData<CoreCompetency[]> {
        throw new Error("Method not implemented.");
    }
}
