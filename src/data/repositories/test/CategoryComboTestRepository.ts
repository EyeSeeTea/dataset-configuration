import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { FutureData } from "$/domain/entities/generic/Future";
import { CategoryCombinationRepository } from "$/domain/repositories/CategoryCombinationRepository";

export class CategoryComboTestRepository implements CategoryCombinationRepository {
    getByIds(_ids: string[]): FutureData<CategoryCombination[]> {
        throw new Error("Method not implemented.");
    }
}
