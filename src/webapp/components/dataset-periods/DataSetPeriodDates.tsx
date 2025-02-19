import React from "react";
import styled from "styled-components";
import { ConfirmationDialog, DatePicker } from "@eyeseetea/d2-ui-components";
import { Typography } from "@material-ui/core";

import { Id } from "$/domain/entities/Ref";
import { useGetDataSetsByIds } from "$/webapp/hooks/useDataSets";
import { addToDate } from "$/utils/date";
import { PeriodDate, PeriodDetailsAttrs } from "$/domain/entities/PeriodDate";
import i18n from "$/utils/i18n";

export type DataSetPeriodDatesProps = {
    dataSetIds: Id[];
    onCancel: () => void;
    onSave: (periodDate: PeriodDate) => void;
};

function useGetYears(props: { period: PeriodDate }) {
    const { period } = props;
    const { startDate, endDate, periods, years } = period;

    const lastYear = years[years.length - 1];

    const periodsByYear = React.useMemo(() => {
        if (!startDate || !endDate) return [];

        return years.map((year): PeriodDate["periods"][number] => {
            const month = 4;
            const day = 1;
            const units = "months";
            const unitValue = 0;
            const currentPeriod = periods.find(period => period.year === year);

            const defaultEndDate = new Date(year + 1, month - 1, day, 0, 0, 0).toISOString();

            const lastYearEndDate =
                units && unitValue ? addToDate(endDate ?? "", units, unitValue) : endDate;

            const endM = year === lastYear ? lastYearEndDate : defaultEndDate;

            return {
                year,
                startDate: currentPeriod?.startDate ?? startDate ?? "",
                endDate: currentPeriod?.endDate ?? endM ?? "",
            };
        });
    }, [years, startDate, endDate, lastYear, periods]);

    return periodsByYear;
}

const emptyPeriodDate = PeriodDate.create({
    startDate: "",
    endDate: "",
    periods: [],
});

export const DataSetPeriodDates = React.memo((props: DataSetPeriodDatesProps) => {
    const { dataSetIds, onCancel, onSave } = props;
    const { dataSets } = useGetDataSetsByIds(dataSetIds);
    const [periodDate, setPeriodDate] = React.useState<PeriodDate>(() => {
        return PeriodDate.create(emptyPeriodDate);
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
        period: PeriodDetailsAttrs,
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
                    minDate={periodDate.startDate || ""}
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
