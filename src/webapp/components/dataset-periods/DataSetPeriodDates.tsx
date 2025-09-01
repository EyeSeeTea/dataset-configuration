import React from "react";
import styled from "styled-components";
import { ConfirmationDialog, DatePicker } from "@eyeseetea/d2-ui-components";
import { Typography } from "@material-ui/core";

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

function useGetYears(props: { period: DatePeriod }) {
    const { config } = useAppContext();
    const { period } = props;

    return React.useMemo(() => period.generatePeriods(config), [period, config]);
}

const emptyPeriodDate = DatePeriod.create({
    startDate: "",
    endDate: "",
    periods: [],
});

export const DataSetPeriodDates = React.memo((props: DataSetPeriodDatesProps) => {
    const { dataSetIds, onCancel, onSave } = props;
    const { dataSets } = useGetDataSetsByIds(dataSetIds);
    const [periodDate, setPeriodDate] = React.useState<DatePeriod>(() => {
        return DatePeriod.create(emptyPeriodDate);
    });

    React.useEffect(() => {
        if (dataSets?.length === 1) {
            setPeriodDate(dataSets[0]?.periodDate ?? emptyPeriodDate);
        }
    }, [dataSets]);

    const dataSetNames = dataSets?.map(dataSet => dataSet.name).join(", ") ?? "";
    const periodsByYear = useGetYears({
        period: periodDate,
    });

    const updatePeriod = (
        period: YearlyPeriodDetailsAttrs,
        value: string,
        fieldName: "startDate" | "endDate"
    ) => {
        if (!periodDate) return;

        const updatedPeriods = periodsByYear.map(periodToUpdate => {
            if (periodToUpdate.year !== period.year) return periodToUpdate;
            return { ...periodToUpdate, [fieldName]: value };
        });
        setPeriodDate(periodDate.updatedPeriods(updatedPeriods));
    };

    const onSavePeriods = () => {
        if (!periodDate) return;
        const periods = periodDate.periods.length === 0 ? periodsByYear : periodDate.periods;
        onSave(periodDate.updatedPeriods(periods));
    };

    const onUpdatePeriodDate = (date: string, fieldName: "startDate" | "endDate") => {
        const newValues = periodDate?.setDates(date, fieldName);
        setPeriodDate(newValues);
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
            {periodsByYear.length > 0 && (
                <PeriodsContainer>
                    <Typography className="periods-text">{i18n.t("Periods")}</Typography>
                    {periodsByYear.map(periodDetail => {
                        return (
                            <PeriodDateItem key={periodDetail.year}>
                                <span>
                                    <strong>{periodDetail.year}</strong>
                                </span>
                                <DatePicker
                                    value={periodDetail.startDate}
                                    onChange={value =>
                                        updatePeriod(periodDetail, value, "startDate")
                                    }
                                    label={i18n.t("Start date of data input")}
                                    className="datepicker"
                                    minDate={periodDate.startDate}
                                    format="yyyy-MM-DD"
                                />
                                <DatePicker
                                    value={periodDetail.endDate}
                                    onChange={value => updatePeriod(periodDetail, value, "endDate")}
                                    label={i18n.t("End date of data input")}
                                    minDate={periodDate.startDate}
                                    className="datepicker"
                                    format="yyyy-MM-DD"
                                />
                            </PeriodDateItem>
                        );
                    })}
                </PeriodsContainer>
            )}
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

const PeriodsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1em;
`;
