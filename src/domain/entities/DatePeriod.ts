import { Struct } from "$/domain/entities/generic/Struct";
import { Config } from "$/domain/entities/Config";
import { addToDate, stringToTime } from "$/utils/date";
import _, { Collection } from "$/domain/entities/generic/Collection";

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

    get monthlyPeriod(): MonthlyPeriodDetails[] {
        if (!this.periods || this.periods.length === 0) {
            return [];
        }

        const allStartTimes = _(this.periods)
            .compactMap(p => stringToTime(p.startDate))
            .value();
        const allEndTime = _(this.periods)
            .compactMap(p => stringToTime(p.endDate))
            .value();

        if (!allStartTimes.length || !allEndTime.length) {
            return [];
        }

        const minStartDate = new Date(Math.min(...allStartTimes));
        const maxEndDate = new Date(Math.max(...allEndTime));

        const months = Collection.range(0, 12);

        return _(this.periods)
            .flatMap(yearPeriod =>
                months.map(month =>
                    MonthlyPeriodDetails.create({
                        year: yearPeriod.year,
                        month: month + 1,
                        startDate: minStartDate.toISOString(),
                        endDate: maxEndDate.toISOString(),
                    })
                )
            )
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

    private buildShortFormat(date: string) {
        if (!date) return "";

        const datePart = new Date(date).toISOString().split("T")[0];
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
