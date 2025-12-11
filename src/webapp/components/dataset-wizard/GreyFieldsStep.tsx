import React from "react";
import differenceBy from "lodash/differenceBy";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@material-ui/core";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { defaultLabel } from "$/domain/entities/Category";
import styled from "styled-components";
import { Maybe } from "$/utils/ts-utils";
import { useAppContext } from "$/webapp/contexts/app-context";
import { NamedRef } from "$/domain/entities/Ref";
import { IndicatorCombination } from "$/domain/entities/Indicator";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { HashMap } from "$/domain/entities/generic/HashMap";
import _ from "$/domain/entities/generic/Collection";
import {
    CategoryOptionCheckBox,
    CombinationTables,
    buildDisableFieldsFromGreyFields,
    disableCategoryOptionFor2026,
    generateGreyFieldsFromDataElements,
    getKey,
} from "$/webapp/components/dataset-wizard/grey-fields/components";

type GreyFieldsStepProps = {
    dataSet: DataSet;
    onChange: (dataSet: DataSet) => void;
};

function getCategories(dataSet: DataSet) {
    const allCombinations = dataSet.indicators.flatMap(indicator => indicator.combinations);
    const combinationsByName = _(allCombinations).groupBy(combination => combination.name);
    const uniqueCombinations = _(allCombinations)
        .map(combination => {
            if (!combination.name) throw new Error("Combination not found");
            const currentCombination = combinationsByName.get(combination.name);
            const allDataElements = currentCombination?.flatMap(cc => cc.dataElements) ?? [];
            return {
                ...combination,
                dataElements: allDataElements,
            };
        })
        .uniqBy(combination => combination.name)
        .value()
        .sort((a, b) => {
            if (a.name === defaultLabel) return 1;
            if (b.name === defaultLabel) return -1;
            return a.name.localeCompare(b.name);
        });

    const allCategories = uniqueCombinations.flatMap(indicator => indicator.categories);

    const uniqueCategories = _(allCategories)
        .filter(category => category.name !== defaultLabel)
        .uniqBy(category => category.id)
        .value();

    return { uniqueCategories, uniqueCombinations };
}

export const GreyFieldsStep = React.memo((props: GreyFieldsStepProps) => {
    const { dataSet, onChange } = props;
    const [disableOptions, setDisabledOptions] = React.useState<string[]>([]);
    const [selectedCompetency, setSelectedCompetency] = React.useState<string>();
    const [greyedFields, setGreyedFields] = React.useState<Record<string, boolean>>(() => {
        return HashMap.fromPairs(
            dataSet.disabledFields.map(fieldId => [
                `${fieldId.dataElementId}.${fieldId.optionComboId}.${fieldId.type}`,
                true,
            ])
        ).toObject();
    });

    const { uniqueCategories, uniqueCombinations: combinations } = React.useMemo(
        () => getCategories(dataSet),
        [dataSet]
    );

    const { existingCombos, combinationById } = useGetExistingCombinations({ combinations });

    const allCoreCompetencies = dataSet.indicators.flatMap(indicator => indicator.coreCompetency);
    const coreCompetencies = _(allCoreCompetencies)
        .uniqBy(competency => competency.id)
        .map(competency => ({ value: competency.id, text: competency.name }))
        .value();

    const updateOptions = (optionId: string, checked: boolean) => {
        const newDisabledOptions = checked
            ? disableOptions.filter(option => option !== optionId)
            : [...disableOptions, optionId];
        setDisabledOptions(newDisabledOptions);

        const allOptionCombos = existingCombos.flatMap(existingCombo => {
            const options = existingCombo.optionsCombos.filter(optionCombo =>
                optionCombo.options.some(option => option.id === optionId)
            );
            return options.length > 0 ? options.map(option => ({ id: option.id })) : undefined;
        });
        const cocToDisable = _(allOptionCombos).compact().value();
        const combinationsWithOptions = combinations.filter(combination => {
            const options = combination.categories.flatMap(category => category.options);
            return options.some(option => option.id === optionId);
        });
        const dataElements = combinationsWithOptions.flatMap(
            combination => combination.dataElements
        );
        const fieldIds = generateGreyFieldsFromDataElements(dataElements, cocToDisable);
        const updatedGreyedFields = _(fieldIds)
            .toHashMap(fieldId => [fieldId, !checked])
            .toObject();

        setGreyedFields(prev => ({ ...prev, ...updatedGreyedFields }));
        buildDisableFieldsFromGreyFields({
            greyedFields: { ...greyedFields, ...updatedGreyedFields },
            onChange,
            dataSet,
            combinations,
        });
    };

    const updateCompetency = (competencyId: Maybe<string>) => {
        setSelectedCompetency(competencyId);
    };

    const combinationsFiltered = selectedCompetency
        ? combinations.filter(combination => combination.coreCompetency.id === selectedCompetency)
        : combinations;

    return (
        <div>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} id="global-grayingout">
                    <Typography>
                        <strong>
                            {i18n.t("Global graying out (disable combinations in all the dataSet)")}
                        </strong>
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <GrayingAllContainer>
                        <CategoriesCheckboxContainer>
                            {uniqueCategories.map(category => (
                                <div key={category.id}>
                                    <Typography>
                                        <strong>{category.name}</strong>
                                    </Typography>
                                    {category.options.map(option => (
                                        <CategoryOptionCheckBox
                                            key={option.id}
                                            disableOptions={disableOptions}
                                            option={option}
                                            updateOptions={updateOptions}
                                            disabled={disableCategoryOptionFor2026(
                                                [option.id],
                                                dataSet?.project?.startDate
                                            )}
                                        />
                                    ))}
                                </div>
                            ))}
                        </CategoriesCheckboxContainer>
                    </GrayingAllContainer>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} id="global-grayingout">
                    <Typography>
                        <strong>{i18n.t("Per indicator graying out")}</strong>
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <div>
                        <Dropdown
                            items={coreCompetencies}
                            onChange={updateCompetency}
                            value={selectedCompetency}
                            label={i18n.t("Core competency")}
                        />
                        <div>
                            {combinationById &&
                                combinationsFiltered.map(combination => (
                                    <CombinationTables
                                        key={combination.id}
                                        combination={combination}
                                        greyedFields={greyedFields}
                                        setGreyedFields={setGreyedFields}
                                        onChange={onChange}
                                        dataSet={dataSet}
                                        combinations={combinations}
                                        combinationById={combinationById}
                                    />
                                ))}
                        </div>
                    </div>
                </AccordionDetails>
            </Accordion>
        </div>
    );
});

function useGetExistingCombinations(props: { combinations: IndicatorCombination[] }) {
    const { combinations } = props;
    const { compositionRoot } = useAppContext();
    const [existingCombos, setExistingCombos] = React.useState<CategoryCombination[]>([]);
    const [combinationById, setCombinationById] = React.useState<Record<string, NamedRef>>();

    React.useEffect(() => {
        const allDataElements = combinations.flatMap(dataElement => dataElement.dataElements);
        const combinationsIds = _(allDataElements)
            .compactMap(dataElement => dataElement?.disaggregation?.id)
            .value();

        return compositionRoot.combination.getByIds
            .execute(combinationsIds)
            .run(existingCombinations => {
                const nonExistingCombinations = generateMissingCombinations(
                    combinations,
                    existingCombinations
                );
                const existingCombinationsById = _(existingCombinations).keyBy(
                    combination => combination.id
                );
                const categoryCombosById = _(allDataElements)
                    .compactMap((dataElement): Maybe<CategoryCombination> => {
                        const { disaggregation } = dataElement;
                        if (!disaggregation) return undefined;
                        return CategoryCombination.buildFromDisaggregation(disaggregation);
                    })
                    .keyBy(catCombination => catCombination.id)
                    .merge(existingCombinationsById);
                const categoryCombinationPairs = categoryCombosById.values().flatMap(cc => {
                    return cc.optionsCombos.map(coc2 => {
                        return [getKey(cc, coc2.options), coc2] as [
                            string,
                            CategoryCombination["optionsCombos"][number]
                        ];
                    });
                });
                const cocByCategoryKey = HashMap.fromPairs(categoryCombinationPairs).toObject();
                setExistingCombos(existingCombinations.concat(nonExistingCombinations));
                setCombinationById(cocByCategoryKey);
            }, console.error);
    }, [combinations, compositionRoot.combination.getByIds]);

    return { existingCombos, combinationById };
}

function generateMissingCombinations(
    combinations: IndicatorCombination[],
    existingCombinations: CategoryCombination[]
): CategoryCombination[] {
    const nonExistingCombinations = differenceBy(
        combinations,
        existingCombinations,
        combination => combination.id
    );
    const allDataElements = nonExistingCombinations.flatMap(
        combination => combination.dataElements
    );
    const uniqueDisaggregations = _(allDataElements)
        .compactMap(dataElement => dataElement.disaggregation)
        .uniqBy(disaggregation => disaggregation.id)
        .value();
    return CategoryCombination.buildFromDisaggregations(uniqueDisaggregations);
}

const CategoriesCheckboxContainer = styled.div`
    max-width: 800px;
`;

const GrayingAllContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding-inline: 1em;
`;
