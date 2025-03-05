import React from "react";
import { DataSet } from "$/domain/entities/DataSet";
import { Indicator, IndicatorWithDataElement } from "$/domain/entities/Indicator";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { SearchBox } from "@eyeseetea/d2-ui-components";
import {
    AddDisaggregateModal,
    AddDisaggregateMode,
} from "$/webapp/components/dataset-wizard/AddDisaggregateModal";
import i18n from "$/utils/i18n";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";
import { Button } from "@material-ui/core";
import { Maybe } from "$/utils/ts-utils";

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
                {i18n.t("Add disaggregate")}
            </Button>
        </div>
    );
}

function useGetRelatedDataElements(props: { dataSet: DataSet; settings: DataSetSettings }) {
    const { dataSet, settings } = props;
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
            }, console.error);
    }, [compositionRoot.indicators.getRelated, dataSet, refresh, settings.existingIndicatorIds]);

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
                const { indicator, dataElements } = indicatorDataElement;

                const currentFullId = [
                    indicator.id,
                    ...dataElements.map(dataElement => dataElement.id),
                ].join(".");
                const selectedFullId = [
                    selectedIndicator.indicator.id,
                    ...selectedIndicator.dataElements.map(dataElement => dataElement.id),
                ].join(".");

                const newIndicator = Indicator.create({
                    ...indicator,
                    categories: selectedCategories,
                    relatedDataElements:
                        selectedIndicator.indicator.type === "outcomes"
                            ? dataElements.map(dataElement => {
                                  return { ...dataElement, categories: selectedCategories };
                              })
                            : [],
                });
                const newDataElements = dataElements.map(dataElement => {
                    return { ...dataElement, categories: selectedCategories };
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

    return { updateIndicators };
}
