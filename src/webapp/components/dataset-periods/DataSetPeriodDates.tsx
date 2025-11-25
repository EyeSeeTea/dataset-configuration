import React from "react";
import styled from "styled-components";
import { ConfirmationDialog, DatePicker } from "@eyeseetea/d2-ui-components";
import { Checkbox, FormControlLabel, Typography } from "@material-ui/core";

import { Id } from "$/domain/entities/Ref";
import { useGetDataSetsByIds } from "$/webapp/hooks/useDataSets";
import { DatePeriod, YearlyPeriodDetailsAttrs } from "$/domain/entities/DatePeriod";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";

export type DataSetPeriodDatesProps = {
    dataSetIds: Id[];
    onCancel: () => void;
    onSave: (periodDate: DatePeriod) => void;
};

function useGetYears(props: {
    period: DatePeriod;
    outcomeSameYear: boolean;
    outputSameYear: boolean;
}) {
    const { config } = useAppContext();
    const { period, outcomeSameYear, outputSameYear } = props;

    return React.useMemo(
        () => period.generatePeriods({ config, outcomeSameYear, outputSameYear }),
        [period, config, outcomeSameYear, outputSameYear]
    );
}

const emptyPeriodDate = DatePeriod.create({
    startDate: "",
    endDate: "",
    periods: [],
    output: [],
    outcome: [],
});

export const DataSetPeriodDates = React.memo((props: DataSetPeriodDatesProps) => {
    const { dataSetIds, onCancel, onSave } = props;
    const { dataSets } = useGetDataSetsByIds(dataSetIds);
    const [periodDate, setPeriodDate] = React.useState<DatePeriod>(() => {
        return DatePeriod.create(emptyPeriodDate);
    });
    const [outcomeSameYear, setOutcomeSameYear] = React.useState(false);
    const [outputSameYear, setOutputSameYear] = React.useState(false);

    React.useEffect(() => {
        if (dataSets?.length === 1) {
            setPeriodDate(dataSets[0]?.periodDate ?? emptyPeriodDate);
        }
    }, [dataSets]);

    const dataSetNames = dataSets?.map(dataSet => dataSet.name).join(", ") ?? "";
    const periodsByYear = useGetYears({
        period: periodDate,
        outcomeSameYear,
        outputSameYear,
    });

    const updatePeriod = (
        period: YearlyPeriodDetailsAttrs,
        value: string,
        fieldName: "startDate" | "endDate",
        periodType: "output" | "outcome"
    ) => {
        if (!periodDate) return;

        const updatedPeriods = periodsByYear[periodType].map(periodToUpdate => {
            if (periodToUpdate.year !== period.year) return periodToUpdate;
            return { ...periodToUpdate, [fieldName]: value };
        });
        setPeriodDate(
            periodDate.updatedPeriods(
                periodDate.periods,
                periodType === "outcome" ? updatedPeriods : periodDate.outcome,
                periodType === "output" ? updatedPeriods : periodDate.output
            )
        );
    };

    const onSavePeriods = () => {
        if (!periodDate) return;
        onSave(periodDate);
    };

    const onUpdatePeriodDate = (date: string, fieldName: "startDate" | "endDate") => {
        const newValues = periodDate?.setDates(date, fieldName);
        setPeriodDate(newValues);
    };

    const updateSameYear =
        (periodType: "output" | "outcome") => (event: React.ChangeEvent<HTMLInputElement>) => {
            const isChecked = event.target.checked;
            if (periodType === "output") {
                setOutputSameYear(isChecked);
            } else {
                setOutcomeSameYear(isChecked);
            }
        };

    const periodTypes = ["output", "outcome"] as const;
    const periodTypeLabels: Record<(typeof periodTypes)[number], string> = {
        output: i18n.t("Output Dates"),
        outcome: i18n.t("Outcome Dates"),
    };

    return (
        <ConfirmationDialog
            cancelText={i18n.t("Close")}
            fullWidth
            onCancel={onCancel}
            open
            title={i18n.t("Set output/outcome period dates: {{dataSetsNames}}", {
                nsSeparator: true,
                dataSetsNames: dataSetNames,
            })}
            saveText={i18n.t("Save")}
            onSave={() => onSavePeriods()}
            disableSave={!periodDate.startDate || !periodDate.endDate}
        >
            <DatesContainer>
                <DatePicker
                    value={periodDate.startDate || null}
                    onChange={value => onUpdatePeriodDate(value, "startDate")}
                    label={i18n.t("Start date of data input")}
                    format="yyyy-MM-DD"
                />
                <DatePicker
                    value={periodDate.endDate || null}
                    onChange={value => onUpdatePeriodDate(value, "endDate")}
                    label={i18n.t("End date of data input")}
                    minDate={periodDate.startDate || undefined}
                    format="yyyy-MM-DD"
                />
            </DatesContainer>
            <PeriodTypeContainer>
                {periodTypes.map(periodType => {
                    const periodsToShow = periodsByYear[periodType];
                    const label = periodTypeLabels[periodType];
                    const sameYearValue =
                        periodType === "output" ? outputSameYear : outcomeSameYear;
                    return (
                        <PeriodsContainer key={periodType}>
                            <Typography className="periods-text">
                                <strong>{label}</strong>
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={sameYearValue}
                                        onChange={updateSameYear(periodType)}
                                    />
                                }
                                label={i18n.t("Apply same dates for every year")}
                            />
                            {periodsToShow.map((periodDetail, index) => {
                                return (
                                    <PeriodDateItem key={periodDetail.year}>
                                        <span>
                                            <strong>{periodDetail.year}</strong>
                                        </span>
                                        <DatePicker
                                            value={periodDetail.startDate}
                                            onChange={value =>
                                                updatePeriod(
                                                    periodDetail,
                                                    value,
                                                    "startDate",
                                                    periodType
                                                )
                                            }
                                            label={i18n.t("Start date of data input")}
                                            className="datepicker"
                                            minDate={periodDate.startDate}
                                            format="yyyy-MM-DD"
                                            disabled={sameYearValue && index > 0}
                                        />
                                        <DatePicker
                                            value={periodDetail.endDate}
                                            onChange={value =>
                                                updatePeriod(
                                                    periodDetail,
                                                    value,
                                                    "endDate",
                                                    periodType
                                                )
                                            }
                                            label={i18n.t("End date of data input")}
                                            minDate={periodDate.startDate}
                                            className="datepicker"
                                            format="yyyy-MM-DD"
                                            disabled={sameYearValue && index > 0}
                                        />
                                    </PeriodDateItem>
                                );
                            })}
                        </PeriodsContainer>
                    );
                })}
            </PeriodTypeContainer>
        </ConfirmationDialog>
    );
});

const DatesContainer = styled.div`
    display: flex;
    gap: 1em;
`;

const PeriodDateItem = styled.div`
    align-items: center;
    display: flex;
    gap: 1em;

    .datepicker {
        margin: 0;
        padding: 0;
    }
`;

const PeriodTypeContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1em;
`;

const PeriodsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1em;
`;
