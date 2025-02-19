import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";

export interface CategoryComboRepository {
    getByIds(ids: Id[]): FutureData<CategoryCombination[]>;
}
