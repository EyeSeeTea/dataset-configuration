import isEqual from "lodash/isEqual";
import _ from "$/domain/entities/generic/Collection";
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
import { Category, defaultLabel } from "$/domain/entities/Category";
import { Maybe } from "$/utils/ts-utils";
import { at } from "$/data/entry-form/CustomForm";

type DisaggregationStepProps = {
    dataSet: DataSet;
    dataSetSettings: DataSetSettings;
    onChange: (dataSet: DataSet) => void;
};

export const DisaggregationStep = React.memo((props: DisaggregationStepProps) => {
    const { dataSet, onChange, dataSetSettings: settings } = props;
    const { config } = useAppContext();
    const [search, setSearch] = React.useState("");
    const [selectedIndicator, setSelectedIndicator] = React.useState<IndicatorWithDataElement>();

    const { indicatorsDataElements, setIndicatorsDataElements } = useGetRelatedDataElements({
        dataSet,
        settings,
        onChange,
    });

    const { updateIndicators } = useUpdateIndicators({
        dataSet,
        indicatorsDataElements,
        onChange,
        selectedIndicator,
        setIndicatorsDataElements,
        setSelectedIndicator,
    });

    const filteredIndicators = Indicator.filterIndicatorDataElements(
        indicatorsDataElements,
        search
    );

    const openDisaggregationModal = (indicatorDataElement: IndicatorWithDataElement) => {
        setSelectedIndicator(indicatorDataElement);
    };

    return (
        <div>
            <SearchBox value={search} onChange={setSearch} />

            {filteredIndicators.map(indicatorWithDataElement => {
                const { indicator, dataElements } = indicatorWithDataElement;
                const ids = dataElements.map(dataElement => dataElement.id).join(".");

                return (
                    <DataElementItem
                        key={`${indicator.id}-${ids}`}
                        indicatorWithDataElement={indicatorWithDataElement}
                        onClick={openDisaggregationModal}
                    />
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
            disaggregation: indicator.type
                ? _(dataElements).first()?.disaggregation
                : indicator.disaggregation,
            categories:
                indicator.type === "outcomes"
                    ? []
                    : dataElements.flatMap(dataElement => dataElement.categories),
            relatedDataElements: indicator.type === "outcomes" ? dataElements : [],
        });
    });
}

function DataElementItem(props: {
    indicatorWithDataElement: IndicatorWithDataElement;
    onClick: (indicatorWithDataElement: IndicatorWithDataElement) => void;
}) {
    const { indicatorWithDataElement, onClick } = props;

    const { dataElements } = indicatorWithDataElement;

    const disaggregationName = _(dataElements)
        .map(dataElement => dataElement.disaggregation?.name)
        .uniq()
        .join("/");

    const categoriesNames = dataElements
        ? _(dataElements)
              .map(dataElement => {
                  return dataElement.categories.map(category => category.name);
              })
              .flatten()
              .uniq()
              .join("/")
        : "";

    return (
        <div className="indicator-row">
            <div>
                {dataElements.map(dataElement => {
                    return <p key={dataElement.id}>{dataElement.name}</p>;
                })}
                <p>
                    {disaggregationName} <strong>{categoriesNames}</strong>
                </p>
            </div>
            <Button
                variant="contained"
                color="primary"
                onClick={() => onClick(indicatorWithDataElement)}
            >
                {i18n.t("Edit disaggregate")}
            </Button>
        </div>
    );
}

function useGetRelatedDataElements(props: {
    dataSet: DataSet;
    settings: DataSetSettings;
    onChange: (dataSet: DataSet) => void;
}) {
    const { dataSet, onChange, settings } = props;
    const { compositionRoot } = useAppContext();
    const [refresh, setRefresh] = React.useState(0);
    const [indicatorsDataElements, setIndicatorsDataElements] = React.useState<
        IndicatorWithDataElement[]
    >([]);

    React.useMemo(() => {
        if (refresh > 0) return;

        return compositionRoot.indicators.getRelated
            .execute({ dataSet, indicatorIdsToIgnore: settings.existingIndicatorIds })
            .run(indicators => {
                const allIndicators = Indicator.buildAllIndicators(indicators);
                setIndicatorsDataElements(allIndicators);
                setRefresh(refresh + 1);
                onChange(dataSet.setIndicators(indicators));
            }, console.error);
    }, [
        compositionRoot.indicators.getRelated,
        dataSet,
        refresh,
        settings.existingIndicatorIds,
        onChange,
    ]);

    return { indicatorsDataElements, setIndicatorsDataElements };
}

function useUpdateIndicators(props: {
    selectedIndicator: Maybe<IndicatorWithDataElement>;
    indicatorsDataElements: IndicatorWithDataElement[];
    setIndicatorsDataElements: React.Dispatch<React.SetStateAction<IndicatorWithDataElement[]>>;
    setSelectedIndicator: React.Dispatch<React.SetStateAction<Maybe<IndicatorWithDataElement>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
}) {
    const { config } = useAppContext();
    const {
        dataSet,
        indicatorsDataElements,
        selectedIndicator,
        onChange,
        setIndicatorsDataElements,
        setSelectedIndicator,
    } = props;

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
                const { indicator, originalDisaggregation, dataElements } = indicatorDataElement;

                const currentFullId = [
                    indicator.id,
                    ...dataElements.map(dataElement => dataElement.id),
                ].join(".");
                const selectedFullId = [
                    selectedIndicator.indicator.id,
                    ...selectedIndicator.dataElements.map(dataElement => dataElement.id),
                ].join(".");

                const newDisaggregation = getDisaggregationForCategories(
                    originalDisaggregation,
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
                    originalDisaggregation,
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
                    return { indicator, originalDisaggregation, dataElements };
                }
            }
        );

        setIndicatorsDataElements(updatedIndicator);
        setSelectedIndicator(undefined);
        onChange(dataSet.setIndicators(updateIndicatorsDataElements(dataSet, updatedIndicator)));
    };

    return { updateIndicators };
}

function getDisaggregationForCategories(
    disaggregation: DataElement["disaggregation"],
    categoryCombos: CategoryCombination[],
    selectedCategories: Category[]
): DisaggregationAttrs {
    const allCategoriesFromCombos = categoryCombos.flatMap(cc => cc.categories);
    const categoriesById = _(allCategoriesFromCombos)
        .uniqBy(category => category.id)
        .keyBy(category => category.id)
        .toObject();

    const getCategoryIds = (categories: Category[]) =>
        _(categories)
            .map(category => category.id)
            .uniq()
            .value();

    const dataElementCategories = at(
        categoriesById,
        _(disaggregation?.categories ?? [])
            .map(c => c.id)
            .value()
    );

    const allCategories = _(dataElementCategories.concat(selectedCategories))
        .uniqBy(category => category.id)
        .value();

    const allValidCategories =
        allCategories.length > 1
            ? allCategories.filter(category => categoriesById[category.id]?.name !== defaultLabel)
            : allCategories;

    const combinedCategoriesIds = getCategoryIds(allValidCategories);

    const existingCategoryCombo = _(categoryCombos)
        .sortBy(categoryCombo => categoryCombo.name.length)
        .find(categoryCombo => {
            const sortedCategoriesIds = _(getCategoryIds(categoryCombo.categories)).sort();
            return isEqual(sortedCategoriesIds, _(combinedCategoriesIds).sort());
        });

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
        const categories = at(categoriesById, combinedCategoriesIds);
        const categoryOptions = categories.map(category => category.options);
        const categoryOptionCombos = _(categoryOptions)
            .cartesian()
            .map(cos => {
                return {
                    id: generateUid(),
                    name: cos.map(co => co.name).join(", "),
                    categoryCombo: { id: newCategoryComboId },
                    categoryOptions: cos,
                };
            })
            .value();

        const ccName = categories.map(cc => cc.name).join("/");
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
