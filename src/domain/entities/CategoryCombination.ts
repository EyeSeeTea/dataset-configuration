import { Category } from "$/domain/entities/Category";
import { Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";
import { Disaggregation } from "$/domain/entities/Indicator";
import { Maybe } from "$/utils/ts-utils";

export type CategoryCombinationAttrs = {
    id: Id;
    name: string;
    categories: Category[];
    optionsCombos: Array<{ id: Id; name: string; options: Category["options"] }>;
};

export class CategoryCombination extends Struct<CategoryCombinationAttrs>() {
    static excludeCombinationFromIndicator(
        combinations: CategoryCombination[],
        disaggregation: Maybe<Disaggregation>
    ): Category[] {
        const categoriesIds = disaggregation?.categories.map(category => category.id) ?? [];
        const categoriesIdsSets = new Set(categoriesIds);

        const allCategories = combinations
            .filter(c => c.id !== disaggregation?.id)
            .flatMap(combination => combination.categories);

        return _(allCategories)
            .filter(category => !categoriesIdsSets.has(category.id))
            .uniqBy(category => category.id)
            .sortBy(category => category.name)
            .value();
    }

    static buildUniqueCategories(combinations: CategoryCombination[]): Category[] {
        const allCategories = combinations.flatMap(combination => {
            return combination.categories;
        });

        return _(allCategories)
            .uniqBy(category => category.id)
            .sortBy(category => category.name)
            .value();
    }

    static buildFromDisaggregations(disaggregations: Disaggregation[]): CategoryCombination[] {
        return disaggregations.map(disaggregation => {
            return this.buildFromDisaggregation(disaggregation);
        });
    }

    static buildFromDisaggregation(disaggregation: Disaggregation): CategoryCombination {
        return CategoryCombination.create({
            ...disaggregation,
            optionsCombos: disaggregation.optionsCombos.map(optionCombo => {
                return {
                    id: optionCombo.id,
                    name: optionCombo.name,
                    options: optionCombo.options,
                };
            }),
        });
    }
}
