import React, { CSSProperties } from "react";
import { Checkbox, FormControlLabel } from "@material-ui/core";

import { DataSet, DisabledField } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { Category, defaultLabel } from "$/domain/entities/Category";
import { NamedRef, Ref } from "$/domain/entities/Ref";
import { DataElementWithCompetency, IndicatorCombination } from "$/domain/entities/Indicator";
import { at, groupConsecutiveBy } from "$/data/entry-form/CustomForm";
import { HashMap } from "$/domain/entities/generic/HashMap";
import _, { Collection } from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";

type HeaderCheckBoxProps = {
    label: string;
    id: string;
    dataElements: DataElementWithCompetency[];
    categoryOptionCombos: Category["options"];
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
};

const HeaderCheckBox = ({
    label,
    id,
    dataElements,
    categoryOptionCombos,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
}: HeaderCheckBoxProps) => {
    const cocsIds = categoryOptionCombos.map(coc => ({ id: coc.id }));
    const fieldIds = generateGreyFieldsFromDataElements(dataElements, cocsIds);
    const allFieldsInColumnAreSelected = at(greyedFields, fieldIds).every(value => !value);

    const disabled = disableCategoryOptionFor2026([id], dataSet?.project?.startDate);

    const toggleAll = () => {
        const updatedGreyedFields = HashMap.fromPairs(
            fieldIds.map(fieldId => [fieldId, allFieldsInColumnAreSelected])
        ).toObject();
        setGreyedFields(prev => ({ ...prev, ...updatedGreyedFields }));
        buildDisableFieldsFromGreyFields({
            greyedFields: { ...greyedFields, ...updatedGreyedFields },
            onChange,
            dataSet,
            combinations,
        });
    };

    return (
        <div onClick={toggleAll} style={{ pointerEvents: disabled ? "none" : "inherit" }}>
            {(dataElements.length > 1 || categoryOptionCombos.length > 1) && (
                <SimpleCheckBox
                    checked={disabled ? false : allFieldsInColumnAreSelected}
                    disabled={disabled}
                />
            )}
            {label === defaultLabel ? "" : label}
        </div>
    );
};

type TableHeaderProps = {
    dataSetElements: DataElementWithCompetency[];
    categoryCombo: Ref;
    categoryOptionCombos: Category["options"][];
    combinationById: Record<string, NamedRef>;
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
};

const TableHeader = ({
    dataSetElements,
    categoryCombo,
    categoryOptionCombos,
    combinationById,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
}: TableHeaderProps) => {
    const nCategories = categoryOptionCombos[0] ? categoryOptionCombos[0].length : 0;
    const rows = Collection.range(0, nCategories)
        .map(index => {
            const consecutiveProducts = groupConsecutiveBy(categoryOptionCombos, cos =>
                cos.slice(0, index + 1)
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
                    console.warn(`no record found for ${index}, ${consecutiveProducts}`);
                    return { label: "", cocs: [], id: "" };
                }
                const label = firstRecord[index]?.name ?? "";
                const id = firstRecord[index]?.id ?? "";
                return { label, cocs: _(cocs).compact().value(), id };
            });
        })
        .value();

    return (
        <>
            {rows.map((row, rowNum) => {
                const isLastHeader = rowNum === rows.length - 1;
                return (
                    <tr key={rowNum}>
                        <th style={{ background: "#f0f0f0" }} className="dataelement-header">
                            {isLastHeader && i18n.t("Data Element")}
                        </th>
                        {row.map(({ label, cocs, id }, colNum) => (
                            <th
                                key={`${rowNum}.${colNum}`}
                                colSpan={cocs.length}
                                className="dataelement-header"
                            >
                                <HeaderCheckBox
                                    label={label}
                                    id={id}
                                    dataElements={dataSetElements}
                                    categoryOptionCombos={cocs}
                                    greyedFields={greyedFields}
                                    setGreyedFields={setGreyedFields}
                                    onChange={onChange}
                                    dataSet={dataSet}
                                    combinations={combinations}
                                />
                            </th>
                        ))}
                    </tr>
                );
            })}
        </>
    );
};

type DataElementCheckboxProps = {
    dataElement: DataElementWithCompetency;
    categoryOptions: Category["options"];
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
    combinationById: Record<string, NamedRef>;
    disabled?: boolean;
};

const DataElementCheckbox = ({
    dataElement,
    categoryOptions,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
    combinationById,
    disabled,
}: DataElementCheckboxProps) => {
    if (!dataElement.disaggregation || !combinationById) return null;
    const key = getKey(dataElement.disaggregation, categoryOptions);
    const categoryOptionCombo = combinationById[key];
    if (!dataElement || !categoryOptionCombo) return null;
    const fieldId = [dataElement.id, categoryOptionCombo.id, dataElement.type].join(".");
    const isGreyed = !!greyedFields[fieldId];

    const toggleGreyedFields = () => {
        setGreyedFields(prev => ({ ...prev, [fieldId]: !isGreyed }));
        buildDisableFieldsFromGreyFields({
            greyedFields: { ...greyedFields, [fieldId]: !isGreyed },
            onChange,
            dataSet,
            combinations,
        });
    };

    return (
        <td key={fieldId} style={{ border: "1px solid rgb(224, 224, 224)", textAlign: "center" }}>
            <SimpleCheckBox
                onClick={toggleGreyedFields}
                checked={disabled ? false : !isGreyed}
                disabled={disabled}
            />
        </td>
    );
};

type DataElementRowsProps = {
    dataElements: DataElementWithCompetency[];
    categoryOptionCombos: Category["options"][];
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
    combinationById: Record<string, NamedRef>;
};

const DataElementRows = ({
    dataElements,
    categoryOptionCombos,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
    combinationById,
}: DataElementRowsProps) => {
    return dataElements.map((dse, deNum) => (
        <tr
            key={deNum}
            style={{ background: deNum % 2 === 0 ? "none" : "#f0f0f0" }}
            className="dataelement-header"
        >
            <td className="dataelement-row" title={dse.name}>
                {dse.name}
            </td>
            {categoryOptionCombos.map((cos, index) => (
                <DataElementCheckbox
                    disabled={disableCategoryOptionFor2026(
                        cos.map(({ id }) => id),
                        dataSet?.project?.startDate
                    )}
                    key={index}
                    dataElement={dse}
                    categoryOptions={cos}
                    greyedFields={greyedFields}
                    setGreyedFields={setGreyedFields}
                    onChange={onChange}
                    dataSet={dataSet}
                    combinations={combinations}
                    combinationById={combinationById}
                />
            ))}
        </tr>
    ));
};

type DataElementTableProps = {
    combination: IndicatorCombination;
    cocs: NamedRef[][];
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
    combinationById: Record<string, NamedRef>;
};

const DataElementTable = ({
    combination,
    cocs,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
    combinationById,
}: DataElementTableProps) => {
    const allDataElements = combination.dataElements;
    const key = [combination, ...cocs.flat()].map(x => x.id).join("-");
    return (
        <div style={{ paddingBlock: "0.5em" }}>
            <table key={key} style={{ borderCollapse: "collapse", borderSpacing: 0 }}>
                <tbody>
                    <TableHeader
                        dataSetElements={allDataElements}
                        categoryCombo={combination}
                        categoryOptionCombos={cocs}
                        combinationById={combinationById}
                        greyedFields={greyedFields}
                        setGreyedFields={setGreyedFields}
                        onChange={onChange}
                        dataSet={dataSet}
                        combinations={combinations}
                    />
                    <DataElementRows
                        dataElements={allDataElements}
                        categoryOptionCombos={cocs}
                        greyedFields={greyedFields}
                        setGreyedFields={setGreyedFields}
                        onChange={onChange}
                        dataSet={dataSet}
                        combinations={combinations}
                        combinationById={combinationById}
                    />
                </tbody>
            </table>
        </div>
    );
};

type TableCategoryCombinationProps = {
    combination: IndicatorCombination;
    cocs: NamedRef[][];
    categoryIndex: number;
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
    combinationById: Record<string, NamedRef>;
};

const TableCategoryCombination = ({
    combination,
    cocs,
    categoryIndex,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
    combinationById,
}: TableCategoryCombinationProps) => {
    const nCategories = cocs[0]?.length ?? 0;
    if (cocs.length <= 12 || categoryIndex >= nCategories - 1) {
        return (
            <DataElementTable
                combination={combination}
                cocs={cocs}
                greyedFields={greyedFields}
                setGreyedFields={setGreyedFields}
                onChange={onChange}
                dataSet={dataSet}
                combinations={combinations}
                combinationById={combinationById}
            />
        );
    } else {
        const consecutive = groupConsecutiveBy(cocs, cos => cos.slice(0, categoryIndex + 1));
        const tables = consecutive.flatMap((splitCocs, index) => (
            <TableCategoryCombination
                key={index}
                combination={combination}
                cocs={splitCocs}
                categoryIndex={categoryIndex + 1}
                greyedFields={greyedFields}
                setGreyedFields={setGreyedFields}
                onChange={onChange}
                dataSet={dataSet}
                combinations={combinations}
                combinationById={combinationById}
            />
        ));
        const key =
            combination.id +
            cocs
                .flat()
                .map(coc => coc.id)
                .join("");
        return <div key={key}>{tables}</div>;
    }
};

type CombinationTablesProps = {
    combination: IndicatorCombination;
    greyedFields: Record<string, boolean>;
    setGreyedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
    combinationById: Record<string, NamedRef>;
};

export const CombinationTables = ({
    combination,
    greyedFields,
    setGreyedFields,
    onChange,
    dataSet,
    combinations,
    combinationById,
}: CombinationTablesProps) => {
    const allOptions = combination.categories.map(category => category.options);
    const cocsProduct = _(allOptions).cartesian().value();
    return (
        <div key={combination.id}>
            <h2>{combination.name === defaultLabel ? i18n.t("None") : combination.name}</h2>
            <TableCategoryCombination
                combination={combination}
                cocs={cocsProduct}
                categoryIndex={0}
                greyedFields={greyedFields}
                setGreyedFields={setGreyedFields}
                onChange={onChange}
                dataSet={dataSet}
                combinations={combinations}
                combinationById={combinationById}
            />
        </div>
    );
};

export function generateGreyFieldsFromDataElements(
    dataElements: DataElementWithCompetency[],
    cocs: Ref[]
) {
    const dataElementIds = dataElements.map(dataElement => ({ id: dataElement.id }));
    const dataElementsCocsProduct = _([dataElementIds, cocs]).cartesian().value();
    const fieldIds = dataElementsCocsProduct.flatMap(([dataElement, coc]) => {
        const deDetails = dataElements.find(de => de.id === dataElement?.id);
        return [dataElement?.id ?? "", coc?.id ?? "", deDetails?.type].join(".");
    });
    return fieldIds;
}

export function buildDisableFieldsFromGreyFields(props: {
    greyedFields: Record<string, boolean>;
    onChange: (dataSet: DataSet) => void;
    dataSet: DataSet;
    combinations: IndicatorCombination[];
}) {
    const { combinations, greyedFields, onChange, dataSet } = props;
    const greyedFieldsCompetency = HashMap.fromObject(greyedFields)
        .mapValues(([key, value]): Maybe<DisabledField> => {
            if (!value) return undefined;
            const [dataElementId, optionComboId] = key.split(".");
            if (!dataElementId || !optionComboId) throw new Error("Invalid key");
            const allDataElements = combinations.flatMap(dataElement => dataElement.dataElements);
            const currentDataElement = allDataElements.find(
                dataElement => dataElement.id === dataElementId
            );
            if (!currentDataElement) {
                console.warn(`Data element ${dataElementId} not found`);
                return undefined;
            }

            return {
                type: currentDataElement.type,
                competencyId: currentDataElement.coreCompetency.id,
                dataElementId,
                optionComboId,
            };
        })
        .values();

    onChange(dataSet.setDisabledFields(_(greyedFieldsCompetency).compact().value()));
}

export function CategoryOptionCheckBox(props: {
    option: NamedRef;
    disableOptions: string[];
    updateOptions: (optionId: string, checked: boolean) => void;
    disabled?: boolean;
}) {
    const { option, disableOptions, updateOptions, disabled } = props;
    const isDisabled = !!disabled;
    const checked = isDisabled ? false : !disableOptions.includes(option.id);

    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={checked}
                    disabled={isDisabled}
                    onChange={(_, isChecked) => updateOptions(option.id, isChecked)}
                    name={option.id}
                />
            }
            label={option.name}
            key={option.id}
        />
    );
}

function SimpleCheckBox(props: { onClick?: () => void; checked: boolean; disabled?: boolean }) {
    const { onClick, checked, disabled } = props;
    const onClickCheckbox = () => {
        if (onClick) onClick();
    };
    const wrapperStyle = React.useMemo<CSSProperties>(
        () => ({
            marginRight: 5,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            pointerEvents: disabled ? "none" : "auto",
            background: disabled ? "#dcdcdc" : "none",
        }),
        [disabled]
    );

    return (
        <span onClick={onClickCheckbox} style={wrapperStyle}>
            <input type="checkbox" readOnly={true} checked={checked} className="simple-checkbox" />
            <span />
        </span>
    );
}

export const getKey = (categoryCombo: Ref, categoryOptions: Category["options"]) => {
    const sortedUniqueIds = _(categoryOptions)
        .map(option => option.id)
        .sort()
        .uniq()
        .value();
    return [categoryCombo.id, ...sortedUniqueIds].join(".");
};

export function disableCategoryOptionFor2026(optionIds: string[], projectStartDate?: string) {
    if (!projectStartDate) return false;

    const startDate = new Date(projectStartDate);
    return startDate.getFullYear() >= 2026 && optionIds.includes("bvFA7fsiN3T");
}
