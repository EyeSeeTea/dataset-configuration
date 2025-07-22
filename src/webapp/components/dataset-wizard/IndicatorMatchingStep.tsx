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
import { Dropdown, DropdownItem } from "@eyeseetea/d2-ui-components";

import { component } from "$/utils/react";
import i18n from "$/utils/i18n";
import { DataSet } from "$/domain/entities/DataSet";
import { IndicatorMatch, IndicatorMatchAttrs } from "$/domain/entities/IndicatorMatch";
import { generateUid } from "$/utils/uid";
import { Maybe } from "$/utils/ts-utils";
import { Id } from "$/domain/entities/Ref";
import _ from "$/domain/entities/generic/Collection";
import { Indicator } from "$/domain/entities/Indicator";

type IndicatorMatchingStepProps = {
    dataSet: DataSet;
    onChange: (dataSet: DataSet) => void;
};

type IndicatorMatchView = IndicatorMatchAttrs & {
    id: string;
    targetOptions: DropdownItem[];
};

type IndicatorMatchingSourceOption = DropdownItem & {
    id: Id;
    validMatchingIndicators: Indicator[];
};

const IndicatorMatchingStep_ = React.memo((props: IndicatorMatchingStepProps) => {
    const { dataSet } = props;

    const sourceIndicators = React.useMemo(() => buildSourceIndicatorOptions(dataSet), [dataSet]);

    const { matches, addNewRow, deleteRow, changeMatch } = useIndicatorMatching({
        ...props,
        sourceIndicators: sourceIndicators,
    });

    const targetIndicators = React.useMemo(
        () =>
            buildTargetIndicatorOptions({
                indicators: dataSet.indicators,
                dataSet,
            }),
        [dataSet]
    );

    const disableAddRow = React.useMemo(() => {
        if (!sourceIndicators.length) {
            return i18n.t("No Global mandatory or Global suggested indicators available.");
        } else if (targetIndicators.length === 1 && targetIndicators[0]?.value === "") {
            return i18n.t("No Local or Donor indicators available.");
        } else if (matches.some(match => !match.source || !match.target)) {
            return i18n.t("Please fill in all fields before adding a new matching indicator.");
        } else {
            return undefined;
        }
    }, [sourceIndicators, targetIndicators, matches]);

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
                                            items={sourceIndicators}
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
                    disabled={!!disableAddRow}
                >
                    {i18n.t("Add matching indicator")}
                </AddButton>
                <Typography paragraph variant={"caption"}>
                    {disableAddRow}
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
        () => _(sourceIndicators).keyBy(sourceIndicator => sourceIndicator.id),
        [sourceIndicators]
    );
    const [matches, setMatches] = React.useState<IndicatorMatchView[]>(
        dataSet.indicatorMatching?.map(match => ({
            ...match,
            id: generateUid(),
            targetOptions: buildTargetIndicatorOptions({
                targetId: match.target,
                dataSet,
                indicators: sourceIndicatorsMap.get(match.source)?.validMatchingIndicators || [],
            }),
        })) || []
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
            targetOptions: [noValidTargets],
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
                    return {
                        ...updatedMatch,
                        targetOptions: buildTargetIndicatorOptions({
                            targetId: match.target,
                            dataSet,
                            indicators:
                                sourceIndicatorsMap.get(updatedMatch.source)
                                    ?.validMatchingIndicators || [],
                        }),
                    };
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

function buildSourceIndicatorOptions(dataSet: DataSet): IndicatorMatchingSourceOption[] {
    const targetByCCMap = _(dataSet.indicators)
        .filter(DataSet.isIndicatorMatchingTarget)
        .groupBy(indicator => indicator.disaggregation?.id || "");

    return dataSet.indicators.filter(DataSet.isIndicatorMatchingSource).map(indicator => ({
        text: indicator.name,
        value: indicator.id,
        id: indicator.id,
        validMatchingIndicators: targetByCCMap.get(indicator.disaggregation?.id || "") || [],
    }));
}

function buildTargetIndicatorOptions(params: {
    indicators: Indicator[];
    dataSet: DataSet;
    targetId?: string;
}): DropdownItem[] {
    const { targetId, indicators, dataSet } = params;
    const targetIndicatorOptions = indicators
        .filter(
            indicator =>
                (DataSet.isIndicatorMatchingTarget(indicator) &&
                    !dataSet.indicatorMatching?.some(match => match.target === indicator.id)) ||
                indicator.id === targetId
        )
        .map(indicator => ({
            text: indicator.name,
            value: indicator.id,
        }));
    return targetIndicatorOptions.length > 0 ? targetIndicatorOptions : [noValidTargets];
}

const noValidTargets: DropdownItem = {
    text: "No valid indicators",
    value: "",
};

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
