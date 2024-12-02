import { CoreCompetency } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";

export class GetCoreCompetencyUseCase {
    constructor(private coreCompetencyRepository: CoreCompetencyRepository) {}

    public execute(): FutureData<CoreCompetency[]> {
        return this.coreCompetencyRepository.getAll();
    }
}
