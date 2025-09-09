import { Struct } from "$/domain/entities/generic/Struct";
import { Config } from "$/domain/entities/Config";
import { addToDate, toISODateWithoutTimezone, getDiff, stringToTime } from "$/utils/date";
import _, { Collection } from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";

const DEFAULT_FUTURE_PERIODS = 1;

export type YearlyPeriodDetailsAttrs = {
    year: number;
    startDate: string;
    endDate: string;
};

type DatePeriodAttrs = { startDate: string; endDate: string; periods: YearlyPeriodDetailsAttrs[] };

export class DatePeriod extends Struct<DatePeriodAttrs>() {
    get years() {
        return this.generateYears();
    }

    get startDateShortFormat() {
        return this.buildShortFormat(this.startDate);
    }

    get endDateShortFormat() {
        return this.buildShortFormat(this.endDate);
    }

    get periodsShortFormat() {
        return this.periods.map(period => ({
            ...period,
            startDate: this.buildShortFormat(period.startDate),
            endDate: this.buildShortFormat(period.endDate),
        }));
    }

    get dataInputPeriods(): MonthlyPeriodDetails[] {
        const { periods, startDate: startDateStr, endDate: endDateStr } = this;
        if (!periods.length) {
            return [];
        }

        const allStartTimes = this.extractPeriodDateAsTimes("startDate");
        const allEndTimes = this.extractPeriodDateAsTimes("endDate");

        if (!allStartTimes.length || !allEndTimes.length) {
            return [];
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const openingDate = new Date(Math.min(...allStartTimes, startDate.getTime()));
        const closingDate = new Date(Math.max(...allEndTimes, endDate.getTime()));

        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth();

        const totalMonths = Math.round(getDiff(startDate, endDate, "month"));

        return Collection.range(0, totalMonths)
            .map(monthOffset => {
                const targetYear = startYear + Math.floor((startMonth + monthOffset) / 12);
                const targetMonth = ((startMonth + monthOffset) % 12) + 1;

                return MonthlyPeriodDetails.create({
                    year: targetYear,
                    month: targetMonth,
                    startDate: toISODateWithoutTimezone(openingDate),
                    endDate: toISODateWithoutTimezone(closingDate),
                });
            })
            .value();
    }

    private extractPeriodDateAsTimes<K extends "startDate" | "endDate">(field: K) {
        return _(this.periods)
            .compactMap(p => stringToTime(p[field]))
            .value();
    }

    generatePeriods(config: DataPeriodConfig): DatePeriod["periods"] {
        const { startDate, endDate, periods, years } = this;

        const month = config.periodEndDateMonth;
        const day = config.periodEndDateDay;
        const units = config.periodLastYearUnits;
        const unitValue = config.periodLastYearEndDate;
        const lastYear = years[years.length - 1];

        return years.map(year => {
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
    }

    initializePeriods(config: DataPeriodConfig): DatePeriod {
        const periods = this.generatePeriods(config);
        return this.updatedPeriods(periods);
    }

    private buildShortFormat(date: string) {
        if (!date) return "";

        const datePart = toISODateWithoutTimezone(new Date(date)).split("T")[0];
        if (!datePart) return "";
        return datePart.replace(/-/g, "");
    }

    generateYears(): number[] {
        const { startDate, endDate } = this;
        if (!startDate || !endDate) return [];

        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();

        return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
    }

    setDates<K extends keyof DatePeriod>(value: DatePeriod[K], fieldName: K): DatePeriod {
        return this._update({ [fieldName]: value });
    }

    updatedPeriods(periods: YearlyPeriodDetailsAttrs[]): DatePeriod {
        return this._update({ periods });
    }

    static getFuturePeriods(endDateStr: Maybe<string>): number {
        if (!endDateStr) return DEFAULT_FUTURE_PERIODS;

        const end = new Date(endDateStr);
        const now = new Date();

        const monthsDiff = Math.ceil(getDiff(now, end, "month"));

        return Math.max(monthsDiff + 1, DEFAULT_FUTURE_PERIODS);
    }
}

export type MonthlyPeriodDetailsAttrs = YearlyPeriodDetailsAttrs & { month: number };
export class MonthlyPeriodDetails extends Struct<MonthlyPeriodDetailsAttrs>() {
    get period() {
        return `${this.year}${String(this.month).padStart(2, "0")}`;
    }
}

type DataPeriodConfig = Pick<
    Config,
    "periodEndDateMonth" | "periodEndDateDay" | "periodLastYearUnits" | "periodLastYearEndDate"
>;
