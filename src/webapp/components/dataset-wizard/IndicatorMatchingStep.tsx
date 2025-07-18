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
import { Dropdown } from "@eyeseetea/d2-ui-components";

import { component } from "$/utils/react";
import i18n from "$/utils/i18n";
import { DataSet } from "$/domain/entities/DataSet";
import { IndicatorMatch } from "$/domain/entities/IndicatorMatch";
import { generateUid } from "$/utils/uid";
import { Indicator, IndicatorScope } from "$/domain/entities/Indicator";
import { Maybe } from "$/utils/ts-utils";

type IndicatorMatchingStepProps = {
    dataSet: DataSet;
    onChange: (dataSet: DataSet) => void;
};

type IndicatorMatchView = IndicatorMatch & {
    id: string;
};

const rootIndicatorType: IndicatorScope[] = ["mandatory", "suggested"];
const matchingIndicatorType: IndicatorScope[] = ["local", "donor"];

const IndicatorMatchingStep_ = React.memo((props: IndicatorMatchingStepProps) => {
    const { dataSet, onChange } = props;
    const [matches, setMatches] = React.useState<IndicatorMatchView[]>(
        dataSet.indicatorMatching?.map(match => ({
            ...match,
            id: generateUid(),
        })) || []
    );
    console.log(dataSet.indicators);

    const rootOptions = React.useMemo(
        () => buildIndicatorOptionsByType(dataSet.indicators, rootIndicatorType),
        [dataSet.indicators]
    );
    const matchingOptions = React.useMemo(
        () => buildIndicatorOptionsByType(dataSet.indicators, matchingIndicatorType),
        [dataSet.indicators]
    );

    const addNewRow = React.useCallback(() => {
        setMatches(prev => [
            ...prev,
            {
                id: generateUid(),
                target: "",
                expression: "",
            },
        ]);
    }, []);

    const deleteRow = React.useCallback((id: string) => {
        setMatches(prev => prev.filter(match => match.id !== id));
    }, []);

    const changeMatch = React.useCallback(
        (id: string, field: keyof IndicatorMatch) => (value: Maybe<string>) => {
            setMatches(prev =>
                prev.map(match => (match.id === id ? { ...match, [field]: value } : match))
            );
        },
        []
    );

    return (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{i18n.t("Root Indicators")}</TableCell>
                                <TableCell>{i18n.t("Matched Indicators")}</TableCell>
                                <TableCell align="right">{i18n.t("Actions")}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {matches.map(match => (
                                <TableRow key={match.id}>
                                    <TableCell>
                                        <Dropdown
                                            className="dropdown"
                                            items={rootOptions}
                                            onChange={changeMatch(match.id, "expression")}
                                            value={match.expression}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Dropdown
                                            className="dropdown"
                                            items={matchingOptions}
                                            onChange={changeMatch(match.id, "target")}
                                            value={match.target}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            aria-label="delete"
                                            onClick={() => deleteRow(match.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
            <Grid item xs={12}>
                <AddButton variant="contained" color="primary" onClick={addNewRow}>
                    {i18n.t("Add matching indicator")}
                </AddButton>
            </Grid>
        </Grid>
    );
});

function buildIndicatorOptionsByType(indicators: Indicator[], types: IndicatorScope[]) {
    return indicators
        .filter(indicator => types.includes(indicator.scope))
        .map(indicator => ({
            text: indicator.name,
            value: indicator.id,
        }));
}

const IndicatorSelect = styled.div`
    width: 100%;
    height: 32px;
    border: 1px solid #ccc;
    border-radius: 4px;
`;

const AddButton = styled(Button)`
    margin-top: 16px;
`;

export const IndicatorMatchingStep = component(IndicatorMatchingStep_);
