import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { CategoryComboRepository } from "$/domain/repositories/CategoryComboRepository";

export class GetCombinationsByIdsUseCase {
    constructor(private categoryComboRepository: CategoryComboRepository) {}

    execute(ids: Id[]): FutureData<CategoryCombination[]> {
        return this.categoryComboRepository.getByIds(ids);
    }
}
