import React from "react";
import {
    Button,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import styled from "styled-components";
import Typography from "@material-ui/core/Typography";

import { component } from "$/utils/react";
import i18n from "$/utils/i18n";
import { DataSet } from "$/domain/entities/DataSet";
import { IndicatorMatch, IndicatorMatchAttrs } from "$/domain/entities/IndicatorMatch";
import { generateUid } from "$/utils/uid";
import { Maybe } from "$/utils/ts-utils";
import { Id } from "$/domain/entities/Ref";
import _ from "$/domain/entities/generic/Collection";
import { Indicator } from "$/domain/entities/Indicator";
import { Dropdown, DropdownItem } from "$/webapp/components/dropdown/Dropdown";
import { HashMap } from "$/domain/entities/generic/HashMap";

type IndicatorMatchingStepProps = {
    dataSet: DataSet;
    onChange: (dataSet: DataSet) => void;
};

type IndicatorMatchView = IndicatorMatchAttrs & {
    id: string;
    targetOptions: DropdownItem[];
};

type IndicatorMatchingSourceOption = DropdownItem & {
    indicator: Indicator;
    validTargetIndicators: IndicatorMatchingTargetOption[];
};

type IndicatorMatchingTargetOption = DropdownItem & {
    indicator?: Indicator;
};

const IndicatorMatchingStep_ = React.memo((props: IndicatorMatchingStepProps) => {
    const { dataSet } = props;
    const [allSourceIndicators] = React.useState(buildSourceIndicatorOptions(dataSet));

    const { matches, addNewRow, deleteRow, changeMatch } = useIndicatorMatching({
        ...props,
        sourceIndicators: allSourceIndicators,
    });

    const availableSourceIndicators = React.useMemo(
        () => buildSourceIndicatorOptions(dataSet, true),
        [dataSet]
    );

    const targetIndicators = React.useMemo(
        () =>
            buildTargetIndicatorOptions({
                indicators: dataSet.indicators,
                dataSet,
            }),
        [dataSet]
    );

    const addRowBlocker = React.useMemo(() => {
        if (!availableSourceIndicators.length) {
            return i18n.t("No Global mandatory or Global suggested indicators available.");
        } else if (targetIndicators.length === 1 && targetIndicators[0]?.value === "") {
            return i18n.t("No Local or Donor indicators available.");
        } else if (matches.some(match => !match.source || !match.target)) {
            return i18n.t("Please fill in all fields before adding a new matching indicator.");
        } else {
            return undefined;
        }
    }, [allSourceIndicators, targetIndicators, matches]);

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TableContainer component={Paper}>
                    <StyledTable>
                        <TableHead>
                            <TableRow>
                                <TableCell width="45%">{i18n.t("Root Indicators")}</TableCell>
                                <TableCell width="45%">{i18n.t("Matched Indicators")}</TableCell>
                                <TableCell width="10%" align="right">
                                    {i18n.t("Actions")}
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {matches.map(match => (
                                <TableRow key={match.id}>
                                    <Cell>
                                        <FullWidthDropdown
                                            className="dropdown"
                                            items={availableSourceIndicators}
                                            onChange={changeMatch(match.id, "source")}
                                            value={match.source}
                                            hideEmpty={true}
                                        />
                                    </Cell>
                                    <Cell width="45%">
                                        <FullWidthDropdown
                                            className="dropdown"
                                            items={match.targetOptions}
                                            onChange={changeMatch(match.id, "target")}
                                            value={match.target}
                                            hideEmpty={true}
                                        />
                                    </Cell>
                                    <TableCell align="right">
                                        <ActionButton
                                            aria-label="delete"
                                            onClick={() => deleteRow(match.id)}
                                        >
                                            <DeleteIcon />
                                        </ActionButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </StyledTable>
                </TableContainer>
            </Grid>
            <Grid item xs={12}>
                <AddButton
                    variant="contained"
                    color="primary"
                    onClick={addNewRow}
                    disabled={!!addRowBlocker}
                >
                    {i18n.t("Add matching indicator")}
                </AddButton>
                <Typography paragraph variant={"caption"}>
                    {addRowBlocker}
                </Typography>
            </Grid>
        </Grid>
    );
});

function useIndicatorMatching(
    props: IndicatorMatchingStepProps & { sourceIndicators: IndicatorMatchingSourceOption[] }
) {
    const { dataSet, onChange, sourceIndicators } = props;

    const sourceIndicatorsMap = React.useMemo(
        () => _(sourceIndicators).keyBy(sourceIndicator => sourceIndicator.indicator.id),
        [sourceIndicators]
    );
    const [matches, setMatches] = React.useState<IndicatorMatchView[]>(
        initializeMatches(dataSet, sourceIndicatorsMap)
    );

    const updateDatasetMatches = React.useCallback(
        (matches: IndicatorMatchView[]) =>
            onChange(
                dataSet.update(
                    "indicatorMatching",
                    matches.map(({ target, source }) => IndicatorMatch.create({ target, source }))
                )
            ),
        [dataSet, onChange]
    );

    const addNewRow = React.useCallback(() => {
        const newMatch = {
            id: generateUid(),
            target: "",
            source: "",
            targetOptions: [getNoValidTargets()],
        };
        setMatches(prev => {
            const updatedMatches = prev.concat(newMatch);
            updateDatasetMatches(updatedMatches);
            return updatedMatches;
        });
    }, [updateDatasetMatches]);

    const deleteRow = React.useCallback(
        (id: string) => {
            setMatches(prev => {
                const updatedMatches = prev.filter(match => match.id !== id);
                updateDatasetMatches(updatedMatches);
                return updatedMatches;
            });
        },
        [updateDatasetMatches]
    );

    const changeMatch = React.useCallback(
        (id: string, field: keyof IndicatorMatchAttrs) => (value: Maybe<string>) => {
            setMatches(prev => {
                const updatedMatches = prev.map(match => {
                    const updatedMatch = match.id === id ? { ...match, [field]: value } : match;
                    const validTargetIndicators =
                        sourceIndicatorsMap.get(updatedMatch.source)?.validTargetIndicators || [];
                    return field === "target" || match.id === id
                        ? {
                              ...updatedMatch,
                              targetOptions: buildTargetIndicatorOptions({
                                  dataSet,
                                  indicators: _(validTargetIndicators)
                                      .compactMap(({ indicator }) => indicator)
                                      .value(),
                              }),
                          }
                        : updatedMatch;
                });
                updateDatasetMatches(updatedMatches);
                return updatedMatches;
            });
        },
        [updateDatasetMatches, sourceIndicatorsMap]
    );

    return {
        matches,
        addNewRow,
        deleteRow,
        changeMatch,
    };
}

function initializeMatches(
    dataSet: DataSet,
    sourceIndicatorsMap: HashMap<Id, IndicatorMatchingSourceOption>
) {
    return (
        dataSet.indicatorMatching?.map(match => {
            const validTargetIndicators =
                sourceIndicatorsMap.get(match.source)?.validTargetIndicators || [];
            return {
                ...match,
                id: generateUid(),
                targetOptions: buildTargetIndicatorOptions({
                    dataSet,
                    indicators: _(validTargetIndicators)
                        .compactMap(({ indicator }) => indicator)
                        .value(),
                    filterUsed: true,
                }),
            };
        }) || []
    );
}

function buildSourceIndicatorOptions(
    dataSet: DataSet,
    filterUsed = false
): IndicatorMatchingSourceOption[] {
    const targetByCCMap = _(
        buildTargetIndicatorOptions({
            indicators: dataSet.indicators,
            dataSet,
            filterUsed: true,
        })
    ).groupBy(indicatorOption => indicatorOption.indicator?.disaggregation?.id || "");

    return dataSet.indicators.filter(DataSet.isIndicatorMatchingSource).map(indicator => {
        const validTargetIndicators = targetByCCMap.get(indicator.disaggregation?.id || "") || [];
        return {
            indicator: indicator,
            text: indicator.name,
            value: indicator.id,
            disabled: filterUsed
                ? validTargetIndicators.every(targetIndicator => targetIndicator.disabled)
                : false,
            validTargetIndicators: validTargetIndicators,
        };
    });
}

type BuildTargetIndicatorOptionsParams = {
    indicators: Indicator[];
    dataSet: DataSet;
    filterUsed?: boolean;
};
function buildTargetIndicatorOptions(
    params: BuildTargetIndicatorOptionsParams
): IndicatorMatchingTargetOption[] {
    const { indicators, dataSet, filterUsed = true } = params;
    return indicators
        .filter(indicator => DataSet.isIndicatorMatchingTarget(indicator))
        .map(indicator => ({
            indicator: indicator,
            text: indicator.name,
            value: indicator.id,
            disabled: filterUsed
                ? dataSet.indicatorMatching?.some(match => match.target === indicator.id)
                : false,
        }));
}

function getNoValidTargets(): IndicatorMatchingTargetOption {
    return { text: "No valid indicators", value: "" };
}

const AddButton = styled(Button)`
    margin-top: 16px;
`;

const StyledTable = styled(Table)`
    table-layout: fixed;
`;

const Cell = styled(TableCell)`
    padding: 8px 16px;
`;

const ActionButton = styled(IconButton)`
    padding: 4px 12px;
`;

const FullWidthDropdown = styled(Dropdown)`
    .MuiInputBase-root {
        width: 100%;
    }
`;

export const IndicatorMatchingStep = component(IndicatorMatchingStep_);
