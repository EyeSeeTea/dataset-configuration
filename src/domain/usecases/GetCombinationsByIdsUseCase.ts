import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { CategoryCombinationRepository } from "$/domain/repositories/CategoryCombinationRepository";

export class GetCombinationsByIdsUseCase {
    constructor(private categoryComboRepository: CategoryCombinationRepository) {}

    execute(ids: Id[]): FutureData<CategoryCombination[]> {
        return this.categoryComboRepository.getByIds(ids);
    }
}
