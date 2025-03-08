import { Category } from "$/domain/entities/Category";
import { Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";
import { DisaggregationAttrs, IndicatorWithDataElement } from "$/domain/entities/Indicator";

export type CategoryCombinationAttrs = {
    id: Id;
    name: string;
    categories: Category[];
    optionsCombos: Array<{ id: Id; name: string; options: Category["options"] }>;
};

export class CategoryCombination extends Struct<CategoryCombinationAttrs>() {
    static buildUniqueCategories(
        combinations: CategoryCombination[],
        indicatorDataElement: IndicatorWithDataElement
    ): Category[] {
        const { originalDisaggregation } = indicatorDataElement;

        const categoriesIds = originalDisaggregation?.categories.map(category => category.id) ?? [];
        const categoriesIdsSets = new Set(categoriesIds);

        const allCategories = combinations.flatMap(combination => {
            return combination.id === originalDisaggregation?.id ? [] : combination.categories;
        });

        return _(allCategories)
            .filter(category => !categoriesIdsSets.has(category.id))
            .uniqBy(category => category.id)
            .sortBy(category => category.name)
            .value();
    }

    static buildFromDisaggregations(disaggregations: DisaggregationAttrs[]): CategoryCombination[] {
        return disaggregations.map(disaggregation => {
            return this.buildFromDisaggregation(disaggregation);
        });
    }

    static buildFromDisaggregation(disaggregation: DisaggregationAttrs): CategoryCombination {
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
