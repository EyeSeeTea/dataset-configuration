import { D2ApiCategoryCombo, D2ApiCategoryComboType } from "$/data/D2ApiCategoryCombo";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { CategoryCombinationRepository } from "$/domain/repositories/CategoryCombinationRepository";
import { D2Api } from "$/types/d2-api";

export class CategoryComboD2Repository implements CategoryCombinationRepository {
    private d2ApiCategoryCombo: D2ApiCategoryCombo;
    constructor(private api: D2Api) {
        this.d2ApiCategoryCombo = new D2ApiCategoryCombo(this.api);
    }

    getByIds(ids: Id[]): FutureData<CategoryCombination[]> {
        return this.d2ApiCategoryCombo
            .getByIds(ids)
            .map(d2Response =>
                d2Response.map(d2CategoryCombo => this.buildCategoryCombo(d2CategoryCombo))
            );
    }

    private buildCategoryCombo(d2CategoryCombo: D2ApiCategoryComboType): CategoryCombination {
        return CategoryCombination.create({
            id: d2CategoryCombo.id,
            name: d2CategoryCombo.displayName,
            categories: d2CategoryCombo.categories.map(category => ({
                id: category.id,
                name: category.displayName,
                options: category.categoryOptions.map(option => ({
                    id: option.id,
                    name: option.displayName,
                })),
            })),
            optionsCombos: d2CategoryCombo.categoryOptionCombos.map(optionCombo => ({
                id: optionCombo.id,
                name: optionCombo.displayName,
                options: optionCombo.categoryOptions.map(option => ({
                    id: option.id,
                    name: option.displayName,
                })),
            })),
        });
    }
}
