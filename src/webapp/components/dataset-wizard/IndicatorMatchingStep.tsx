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

import { component } from "$/utils/react";
import i18n from "$/utils/i18n";
import {
    DataSet,
    matchingIndicatorSourceScope,
    matchingIndicatorTargetScope,
    matchingIndicatorType,
} from "$/domain/entities/DataSet";
import { IndicatorMatch, IndicatorMatchAttrs } from "$/domain/entities/IndicatorMatch";
import { generateUid } from "$/utils/uid";
import { Maybe } from "$/utils/ts-utils";
import Typography from "@material-ui/core/Typography";
import { Dropdown, DropdownItem } from "$/webapp/components/dropdown/Dropdown";

type IndicatorMatchingStepProps = {
    dataSet: DataSet;
    onChange: (dataSet: DataSet) => void;
};

type IndicatorMatchView = IndicatorMatchAttrs & {
    id: string;
    rootOptions: DropdownItem[];
    matchingOptions: DropdownItem[];
};

const IndicatorMatchingStep_ = React.memo((props: IndicatorMatchingStepProps) => {
    const { dataSet } = props;
    const { matches, addNewRow, deleteRow, changeMatch } = useIndicatorMatching(props);

    const rootIndicators = React.useMemo(
        () => buildIndicatorOptionsByType("root", dataSet),
        [dataSet]
    );
    const matchingIndicators = React.useMemo(
        () => buildIndicatorOptionsByType("matching", dataSet).filter(option => !option.disabled),
        [dataSet]
    );

    const disableAddRow = React.useMemo(() => {
        if (!rootIndicators.length) {
            return i18n.t("No Global mandatory or Global suggested indicators available.");
        } else if (!matchingIndicators.length) {
            return i18n.t("No Local or Donor indicators available.");
        } else if (matches.some(match => !match.source || !match.target)) {
            return i18n.t("Please fill in all fields before adding a new matching indicator.");
        } else {
            return undefined;
        }
    }, [rootIndicators, matchingIndicators, matches]);

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
                                        <Dropdown
                                            className="dropdown"
                                            items={match.rootOptions}
                                            onChange={changeMatch(match.id, "source")}
                                            value={match.source}
                                            hideEmpty={true}
                                        />
                                    </Cell>
                                    <Cell width="45%">
                                        <Dropdown
                                            className="dropdown"
                                            items={match.matchingOptions}
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

function useIndicatorMatching(props: IndicatorMatchingStepProps) {
    const { dataSet, onChange } = props;

    const [matches, setMatches] = React.useState<IndicatorMatchView[]>(
        dataSet.indicatorMatching?.map(match => ({
            ...match,
            id: generateUid(),
            rootOptions: buildIndicatorOptionsByType("root", dataSet),
            matchingOptions: buildIndicatorOptionsByType("matching", dataSet),
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
            rootOptions: buildIndicatorOptionsByType("root", dataSet),
            matchingOptions: buildIndicatorOptionsByType("matching", dataSet),
        };
        setMatches(prev => {
            const updatedMatches = prev.concat(newMatch);
            updateDatasetMatches(updatedMatches);
            return updatedMatches;
        });
    }, [dataSet, updateDatasetMatches]);

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
                const updatedMatches = prev.map(match =>
                    match.id === id ? { ...match, [field]: value } : match
                );
                updateDatasetMatches(updatedMatches);
                return updatedMatches;
            });
        },
        [updateDatasetMatches]
    );

    return {
        matches,
        addNewRow,
        deleteRow,
        changeMatch,
    };
}

function buildIndicatorOptionsByType(type: "root" | "matching", dataSet: DataSet) {
    const options = type === "root" ? matchingIndicatorSourceScope : matchingIndicatorTargetScope;

    return dataSet.indicators
        .filter(
            indicator =>
                options.includes(indicator.scope) && indicator.type === matchingIndicatorType
        )
        .map(indicator => ({
            text: indicator.name,
            value: indicator.id,
            //disable matching indicators because it can't have more than 1 value
            disabled:
                type !== "root" &&
                dataSet.indicatorMatching?.some(match => match.target === indicator.id),
        }));
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

export const IndicatorMatchingStep = component(IndicatorMatchingStep_);
