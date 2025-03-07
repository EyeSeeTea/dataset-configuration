import _, { Collection } from "$/domain/entities/generic/Collection";
import React from "react";
import { Dropdown } from "@eyeseetea/d2-ui-components";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Checkbox,
    FormControlLabel,
    Typography,
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { Category, defaultLabel } from "$/domain/entities/Category";
import styled from "styled-components";
import { Maybe } from "$/utils/ts-utils";
import { useAppContext } from "$/webapp/contexts/app-context";
import { NamedRef, Ref } from "$/domain/entities/Ref";
import { IndicatorCombination } from "$/domain/entities/Indicator";
import { DataElement } from "$/domain/entities/DataElement";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { at, groupConsecutiveBy } from "$/data/entry-form/CustomForm";
import { HashMap } from "$/domain/entities/generic/HashMap";
import { differenceBy } from "lodash";

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

const getKey = (categoryCombo: Ref, categoryOptions: Category["options"]) => {
    const sortedUniqueIds = _(categoryOptions)
        .map(option => option.id)
        .sort()
        .uniq()
        .value();

    return [categoryCombo.id, ...sortedUniqueIds].join(".");
};

export const GreyFieldsStep = React.memo((props: GreyFieldsStepProps) => {
    const { compositionRoot } = useAppContext();
    const { dataSet, onChange } = props;
    const [disableOptions, setDisabledOptions] = React.useState<string[]>([]);
    const [selectedCompetency, setSelectedCompetency] = React.useState<string>();
    const [existingCombos, setExistingCombos] = React.useState<CategoryCombination[]>([]);
    const [combinationById, setCombinationById] = React.useState<Record<string, NamedRef>>();
    const [greyedFields, setGreyedFields] = React.useState<Record<string, boolean>>(() => {
        return dataSet.disabledFields.reduce((acc, fieldId) => {
            return {
                ...acc,
                [`${fieldId.dataElementId}.${fieldId.optionComboId}`]: true,
            };
        }, {} as Record<string, boolean>);
    });

    const { uniqueCategories, uniqueCombinations: combinations } = React.useMemo(
        () => getCategories(dataSet),
        [dataSet]
    );

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
                        return disaggregation
                            ? CategoryCombination.create({
                                  ...disaggregation,
                                  optionsCombos: disaggregation.optionsCombos.map(coc => {
                                      return { ...coc, options: coc.options };
                                  }),
                              })
                            : undefined;
                    })
                    .keyBy(x => x.id)
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

    React.useEffect(() => {
        const greyedFieldsCompetency = HashMap.fromObject(greyedFields)
            .mapValues(([key]) => {
                const [dataElementId, optionComboId] = key.split(".");
                if (!dataElementId || !optionComboId) throw new Error("Invalid key");
                const allDataElements = combinations.flatMap(
                    dataElement => dataElement.dataElements
                );
                const currentDataElement = allDataElements.find(
                    dataElement => dataElement.id === dataElementId
                );
                return {
                    competencyId: currentDataElement?.coreCompetency.id ?? "",
                    dataElementId,
                    optionComboId,
                };
            })
            .values();

        onChange(dataSet.setDisabledFields(greyedFieldsCompetency));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [greyedFields, onChange]);

    const allCoreCompetencies = dataSet.indicators.flatMap(indicator => indicator.coreCompetency);

    const coreCompetencies = _(allCoreCompetencies)
        .uniqBy(competency => competency.id)
        .map(competency => ({
            value: competency.id,
            text: competency.name,
        }))
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
    };

    const updateCompetency = (competencyId: Maybe<string>) => {
        setSelectedCompetency(competencyId);
    };

    const renderHeaderCheckBox = (
        label: string,
        dataElements: DataElement[],
        categoryOptionCombos: NamedRef[]
    ) => {
        const cocsIds = categoryOptionCombos.map(coc => ({ id: coc.id }));
        const fieldIds = generateGreyFieldsFromDataElements(dataElements, cocsIds);

        const allFieldsInColumnAreSelected = at(greyedFields, fieldIds).every(value => !value);

        const toggleAll = () => {
            const updatedGreyedFields = HashMap.fromPairs(
                fieldIds.map(fieldId => [fieldId, allFieldsInColumnAreSelected])
            ).toObject();

            setGreyedFields(prev => ({ ...prev, ...updatedGreyedFields }));
        };

        return (
            <div onClick={toggleAll}>
                {(dataElements.length > 1 || categoryOptionCombos.length > 1) && (
                    <SimpleCheckBox checked={allFieldsInColumnAreSelected} />
                )}
                {label === defaultLabel ? "" : label}
            </div>
        );
    };

    const renderTables = (combination: IndicatorCombination) => {
        const allOptions = combination.categories.map(category => category.options);
        const cocsProduct = _(allOptions).cartesian().value();
        return (
            <div key={combination.id}>
                <h2>{combination.name === defaultLabel ? i18n.t("None") : combination.name}</h2>
                {renderTablesForCocs(combination, cocsProduct, 0)}
            </div>
        );
    };

    const renderTableHeader = (
        dataSetElements: DataElement[],
        categoryCombo: IndicatorCombination,
        categoryOptionCombos: NamedRef[][]
    ) => {
        if (!combinationById) return;

        const nCategories = categoryOptionCombos[0] ? categoryOptionCombos[0].length : 0;
        const rows = Collection.range(0, nCategories)
            .map(idx => {
                const consecutiveProducts = groupConsecutiveBy(categoryOptionCombos, cos =>
                    cos.slice(0, idx + 1)
                );
                return consecutiveProducts.map(consecutiveProducts => {
                    const cocs = consecutiveProducts
                        .map(cos => {
                            const key = getKey(categoryCombo, cos);
                            return key;
                        })
                        .map(key => combinationById[key]);

                    const firstRecord = consecutiveProducts[0];
                    if (!firstRecord) {
                        console.warn("no record found for", idx, consecutiveProducts);
                        return { label: "", cocs: [] };
                    }
                    const label = firstRecord[idx]?.name ?? "";

                    return { label, cocs: _(cocs).compact().value() };
                });
            })
            .value();

        return rows.map((row, rowNum) => {
            const isLastHeader = rowNum === rows.length - 1;

            return (
                <tr key={rowNum}>
                    <th style={{ background: "#f0f0f0" }} className="dataelement-header">
                        {isLastHeader && i18n.t("Data Element")}
                    </th>

                    {row.map(({ label, cocs }, colNum) => (
                        <th
                            key={`${rowNum}.${colNum}`}
                            colSpan={cocs.length}
                            className="dataelement-header"
                        >
                            {renderHeaderCheckBox(label, dataSetElements, cocs)}
                        </th>
                    ))}
                </tr>
            );
        });
    };

    const renderDataElements = (
        dataElements: DataElement[],
        categoryOptionCombos: NamedRef[][]
    ) => {
        return dataElements.map((dse, deNum) => {
            return (
                <tr
                    key={deNum}
                    style={{
                        background: deNum % 2 === 0 ? "none" : "#f0f0f0",
                    }}
                    className="dataelement-header "
                >
                    <td className="dataelement-row" title={dse.name}>
                        {dse.name}
                    </td>
                    {categoryOptionCombos.map(cos => renderCheckbox(dse, cos))}
                </tr>
            );
        });
    };

    const renderCheckbox = (dataElement: DataElement, categoryOptions: NamedRef[]) => {
        if (!dataElement.disaggregation || !combinationById) return;

        const key = getKey(dataElement.disaggregation, categoryOptions);
        const categoryOptionCombo = combinationById[key];
        if (!dataElement || !categoryOptionCombo) return;

        const fieldId = [dataElement.id, categoryOptionCombo.id].join(".");
        const isGreyed = !!greyedFields[fieldId];
        const toggleGreyedFields = () => {
            setGreyedFields(prev => {
                return { ...prev, [fieldId]: !isGreyed };
            });
        };

        return (
            <td
                key={fieldId}
                style={{ border: "1px solid rgb(224, 224, 224)", textAlign: "center" }}
            >
                <SimpleCheckBox onClick={toggleGreyedFields} checked={!isGreyed} />
            </td>
        );
    };

    const renderTable = (combination: IndicatorCombination, cocs: NamedRef[][]) => {
        const allDataElements = combination.dataElements;
        const key = [combination, ...cocs.flat()].map(x => x.id).join("-");

        return (
            <div style={{ paddingBlock: "0.5em" }}>
                <table key={key} style={{ borderCollapse: "collapse", borderSpacing: 0 }}>
                    <tbody>
                        {renderTableHeader(allDataElements, combination, cocs)}
                        {renderDataElements(allDataElements, cocs)}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTablesForCocs = (
        categoryCombo: IndicatorCombination,
        cocs: NamedRef[][],
        categoryIndex: number
    ) => {
        const nCategories = cocs[0]?.length ?? 0;
        if (cocs.length <= 12 || categoryIndex >= nCategories - 1) {
            return renderTable(categoryCombo, cocs);
        } else {
            const consecutive = groupConsecutiveBy(cocs, cos => cos.slice(0, categoryIndex + 1));
            const tables = consecutive.flatMap(splitCocs =>
                renderTablesForCocs(categoryCombo, splitCocs, categoryIndex + 1)
            );
            const key =
                categoryCombo.id +
                cocs
                    .flat()
                    .map(coc => coc.id)
                    .join("");
            return <div key={key}>{tables}</div>;
        }
    };

    const combinationsFiltered = selectedCompetency
        ? combinations.filter(combination => combination.coreCompetency.id === selectedCompetency)
        : combinations;

    return (
        <div>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="global-grayingout"
                >
                    <Typography>
                        <strong>
                            {i18n.t("Global graying out (disable combinationsin all the dataSet)")}
                        </strong>
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <GrayingAllContainer>
                        <CategoriesCheckboxContainer>
                            {uniqueCategories.map(category => {
                                return (
                                    <div key={category.id}>
                                        <Typography>
                                            <strong>{category.name}</strong>
                                        </Typography>
                                        {category.options.map(option => {
                                            return (
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={
                                                                !disableOptions.includes(option.id)
                                                            }
                                                            onChange={(_, checked) =>
                                                                updateOptions(option.id, checked)
                                                            }
                                                            name={option.id}
                                                        />
                                                    }
                                                    label={option.name}
                                                    key={option.id}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </CategoriesCheckboxContainer>
                    </GrayingAllContainer>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="global-grayingout"
                >
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
                                combinationsFiltered.map(combination => {
                                    return renderTables(combination);
                                })}
                        </div>
                    </div>
                </AccordionDetails>
            </Accordion>
        </div>
    );
});

function SimpleCheckBox(props: { onClick?: () => void; checked: boolean }) {
    const { onClick, checked } = props;

    const onClickCheckbox = () => {
        if (onClick) onClick();
    };

    return (
        <span onClick={onClickCheckbox} style={{ marginRight: 5 }}>
            <input type="checkbox" readOnly={true} checked={checked} className="simple-checkbox" />
            <span />
        </span>
    );
}

function generateGreyFieldsFromDataElements(dataElements: DataElement[], cocs: Ref[]) {
    const dataElementIds = dataElements.map(dataElement => ({ id: dataElement.id }));
    const dataElementsCocsProduct = _([dataElementIds, cocs]).cartesian().value();

    const fieldIds = dataElementsCocsProduct.flatMap(([dataElement, coc]) =>
        [dataElement?.id ?? "", coc?.id ?? ""].join(".")
    );
    return fieldIds;
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
