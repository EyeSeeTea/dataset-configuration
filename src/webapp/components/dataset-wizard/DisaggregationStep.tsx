import _ from "lodash";
import React from "react";
import { DataSet } from "$/domain/entities/DataSet";
import {
    DisaggregationAttrs,
    Indicator,
    IndicatorWithDataElement,
} from "$/domain/entities/Indicator";
import { useAppContext } from "$/webapp/contexts/app-context";
import { SearchBox } from "@eyeseetea/d2-ui-components";
import {
    AddDisaggregateModal,
    AddDisaggregateMode,
} from "$/webapp/components/dataset-wizard/AddDisaggregateModal";
import i18n from "$/utils/i18n";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { Button } from "@material-ui/core";
import { generateUid } from "$/utils/uid";
import { DataElement } from "$/domain/entities/DataElement";
import { Category } from "$/domain/entities/Category";

type DisaggregationStepProps = {
    dataSet: DataSet;
    dataSetSettings: DataSetSettings;
    onChange: (dataSet: DataSet) => void;
};

export const DisaggregationStep = React.memo((props: DisaggregationStepProps) => {
    const { dataSet, onChange, dataSetSettings: settings } = props;
    const { config, compositionRoot } = useAppContext();
    const [search, setSearch] = React.useState("");
    const [selectedIndicator, setSelectedIndicator] = React.useState<IndicatorWithDataElement>();
    const [refresh, setRefresh] = React.useState(0);
    const [indicatorsDataElements, setIndicatorsDataElements] = React.useState<
        IndicatorWithDataElement[]
    >([]);

    React.useMemo(() => {
        if (refresh > 0) return;

        return compositionRoot.indicators.getRelated
            .execute({ dataSet, indicatorsIdsToIgnore: settings.existingIndicatorsIds })
            .run(indicators => {
                const allIndicators = Indicator.buildAllIndicators(indicators);
                setIndicatorsDataElements(allIndicators);
                setRefresh(refresh + 1);
            }, console.error);
    }, [compositionRoot.indicators.getRelated, dataSet, refresh, settings.existingIndicatorsIds]);

    const filteredIndicators = Indicator.filterIndicatorDataElements(
        indicatorsDataElements,
        search
    );

    const openDisaggregationModal = (indicatorDataElement: IndicatorWithDataElement) => {
        setSelectedIndicator(indicatorDataElement);
    };

    const updateIndicators = (params: { categoriesIds: string[]; mode: AddDisaggregateMode }) => {
        if (!selectedIndicator) return;
        const { categoriesIds, mode } = params;

        const categories = CategoryCombination.buildUniqueCategories(
            config.categoryCombinations,
            selectedIndicator
        );

        const selectedCategories = categories.filter(category =>
            categoriesIds.includes(category.id)
        );

        const updatedIndicator = indicatorsDataElements.map(
            (indicatorDataElement): IndicatorWithDataElement => {
                const { indicator, dataElements } = indicatorDataElement;

                const currentFullId = [
                    indicator.id,
                    ...dataElements.map(dataElement => dataElement.id),
                ].join(".");
                const selectedFullId = [
                    selectedIndicator.indicator.id,
                    ...selectedIndicator.dataElements.map(dataElement => dataElement.id),
                ].join(".");

                const newDisaggregation = getDisaggregationForCategories(
                    indicator.disaggregation,
                    config.categoryCombinations,
                    selectedCategories
                );

                const newIndicator = Indicator.create({
                    ...indicator,
                    disaggregation: newDisaggregation,
                    categories: selectedCategories,
                    relatedDataElements:
                        selectedIndicator.indicator.type === "outcomes"
                            ? dataElements.map(dataElement => {
                                  return {
                                      ...dataElement,
                                      categories: selectedCategories,
                                      disaggregation: newDisaggregation,
                                  };
                              })
                            : [],
                });
                const newDataElements = dataElements.map(dataElement => {
                    return {
                        ...dataElement,
                        categories: selectedCategories,
                        disaggregation: newDisaggregation,
                    };
                });

                const record: IndicatorWithDataElement = {
                    indicator: newIndicator,
                    dataElements: newDataElements,
                };

                if (mode === "indicator" && currentFullId === selectedFullId) {
                    return record;
                } else if (
                    mode === "competency" &&
                    indicator.coreCompetency.id === selectedIndicator.indicator.coreCompetency.id
                ) {
                    return record;
                } else if (mode === "all") {
                    return record;
                } else {
                    return { indicator, dataElements };
                }
            }
        );

        setIndicatorsDataElements(updatedIndicator);
        setSelectedIndicator(undefined);
        onChange(dataSet.setIndicators(updateIndicatorsDataElements(dataSet, updatedIndicator)));
    };

    return (
        <div>
            <SearchBox value={search} onChange={setSearch} />

            {filteredIndicators.map(indicatorWithDataElement => {
                const { indicator, dataElements } = indicatorWithDataElement;

                const ids = dataElements.map(dataElement => dataElement.id).join(".");

                const disaggregationName = _(dataElements)
                    .map(dataElement => dataElement.disaggregation?.name)
                    .uniq()
                    .join("/");

                return (
                    <div className="indicator-row" key={`${indicator.id}-${ids}`}>
                        <div>
                            {dataElements.map(dataElement => {
                                return <p key={dataElement.id}>{dataElement.name}</p>;
                            })}
                            <p>
                                <strong>{disaggregationName}</strong>
                            </p>
                        </div>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => openDisaggregationModal(indicatorWithDataElement)}
                        >
                            {i18n.t("Add disaggregate")}
                        </Button>
                    </div>
                );
            })}

            {selectedIndicator && (
                <AddDisaggregateModal
                    combinations={config.categoryCombinations}
                    indicator={selectedIndicator}
                    dataSet={dataSet}
                    onClose={() => setSelectedIndicator(undefined)}
                    onSave={updateIndicators}
                />
            )}
        </div>
    );
});

function updateIndicatorsDataElements(
    dataSet: DataSet,
    indicators: IndicatorWithDataElement[]
): Indicator[] {
    if (indicators.length === 0) return [];

    const dataElementsByIndicator = indicators.flatMap(indicator =>
        indicator.dataElements.map(dataElement => ({
            ...dataElement,
            indicatorId: indicator.indicator.id,
        }))
    );

    return dataSet.indicators.map(indicator => {
        const dataElements = dataElementsByIndicator.filter(de => de.indicatorId === indicator.id);

        return Indicator.create({
            ...indicator,
            disaggregation: dataElements[0]
                ? dataElements[0].disaggregation
                : indicator.disaggregation,
            categories:
                indicator.type === "outcomes"
                    ? []
                    : dataElements.flatMap(dataElement => dataElement.categories),
            relatedDataElements: indicator.type === "outcomes" ? dataElements : [],
        });
    });
}

function getDisaggregationForCategories(
    disaggregation: DataElement["disaggregation"],
    categoryCombos: CategoryCombination[],
    categories: Category[]
): DisaggregationAttrs {
    const categoriesById = _(categoryCombos)
        .flatMap(cc => cc.categories)
        .uniqBy(category => category.id)
        .keyBy(category => category.id)
        .value();

    const getCategoryIds = (categories: Category[]) =>
        _(categories)
            .map(category => category.id)
            .uniq()
            .value();

    const deCategories = _.at(
        categoriesById,
        _(disaggregation?.categories)
            .map(c => c.id)
            .value()
    );

    const allCategories = _(deCategories)
        .concat(categories)
        .uniqBy(category => category.id)
        .value();

    const allValidCategories =
        allCategories.length > 1
            ? allCategories.filter(category => categoriesById[category.id]?.name !== "default")
            : allCategories;

    const combinedCategoriesIds = getCategoryIds(allValidCategories);
    const existingCategoryCombo = categoryCombos.find(cc =>
        _(getCategoryIds(cc.categories)).sortBy().isEqual(_.sortBy(combinedCategoriesIds))
    );

    if (existingCategoryCombo) {
        return {
            id: existingCategoryCombo.id,
            name: existingCategoryCombo.name,
            categories: existingCategoryCombo.categories,
            optionsCombos: existingCategoryCombo.optionsCombos.map(optionCombo => {
                return {
                    id: optionCombo.id,
                    name: optionCombo.name,
                    options: optionCombo.options,
                    categoryCombo: { id: existingCategoryCombo.id },
                };
            }),
        };
    } else {
        const newCategoryComboId = generateUid();
        const categories = _.at(categoriesById, combinedCategoriesIds);
        const categoryOptions = categories.map(c => c.options);
        const categoryOptionCombos = _.product(...categoryOptions).map(cos => {
            return {
                id: generateUid(),
                name: cos.map(co => co.name).join(", "),
                categoryCombo: { id: newCategoryComboId },
                categoryOptions: cos,
            };
        });
        const ccName = allValidCategories.map(cc => cc.name).join("/");
        const newCategoryCombo: DisaggregationAttrs = {
            id: newCategoryComboId,
            name: ccName,
            categories: categories,
            optionsCombos: categoryOptionCombos.map(coc => {
                return {
                    id: coc.id,
                    name: coc.name,
                    options: coc.categoryOptions,
                    categoryCombo: { id: newCategoryComboId },
                };
            }),
        };
        return newCategoryCombo;
    }
}
