import { convertAttributeValueToDate } from "$/data/utils";
import { DatePeriod } from "$/domain/entities/DatePeriod";
import _ from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";

export function parsePeriodDateAttribute(periodDate: Maybe<string>): DatePeriod["periods"] {
    const splitPeriodsDates = getPeriodDatesFromAttributeValue(periodDate);
    return _(splitPeriodsDates)
        .compactMap(period => {
            const [year, dates] = getYearAndDatesFromPeriodValue(period);
            if (!year || !dates) return undefined;
            const [startDate, endDate] = getStartEndDate(dates);
            if (!startDate || !endDate) return undefined;
            return {
                year: Number(year),
                startDate: convertAttributeValueToDate(startDate),
                endDate: convertAttributeValueToDate(endDate),
            };
        })
        .value();
}

export function getPeriodDatesFromAttributeValue(periodDate: Maybe<string>): string[] {
    return periodDate?.split(",") ?? [];
}

export function getYearAndDatesFromPeriodValue(period: string): string[] {
    return period.split("=") ?? [];
}

export function getStartEndDate(period: Maybe<string>): string[] {
    return period?.split("-") ?? [];
}
