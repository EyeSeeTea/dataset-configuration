import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { FutureData } from "$/domain/entities/generic/Future";
import { CategoryComboRepository } from "$/domain/repositories/CategoryComboRepository";

export class CategoryComboTestRepository implements CategoryComboRepository {
    getByIds(_ids: string[]): FutureData<CategoryCombination[]> {
        throw new Error("Method not implemented.");
    }
}
