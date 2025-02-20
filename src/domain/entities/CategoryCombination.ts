import { Category } from "$/domain/entities/Category";
import { Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";
import { IndicatorWithDataElement } from "$/domain/entities/Indicator";

export type CategoryCombinationAttrs = { id: Id; name: string; categories: Category[] };

export class CategoryCombination extends Struct<CategoryCombinationAttrs>() {
    static buildUniqueCategories(
        combinations: CategoryCombination[],
        indicatorDataElement: IndicatorWithDataElement
    ): Category[] {
        const { dataElements } = indicatorDataElement;

        const categoriesToFilter = dataElements.flatMap(dataElement => {
            return dataElement.disaggregation?.categories.map(category => category.id) ?? [];
        });

        const allCategories = combinations.flatMap(combination => {
            const disaggregationId = dataElements[0]?.disaggregation?.id;
            return combination.id === disaggregationId ? [] : combination.categories;
        });

        return _(allCategories)
            .filter(category => !categoriesToFilter.includes(category.id))
            .uniqBy(category => category.id)
            .sortBy(category => category.name)
            .value();
    }
}
