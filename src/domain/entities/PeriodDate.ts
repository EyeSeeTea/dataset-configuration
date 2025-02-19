import { Struct } from "$/domain/entities/generic/Struct";

export type PeriodDetailsAttrs = { year: number; startDate: string; endDate: string };
type PeriodDateAttrs = { startDate: string; endDate: string; periods: PeriodDetailsAttrs[] };

export class PeriodDate extends Struct<PeriodDateAttrs>() {
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

    setDates(date: string, fieldName: "startDate" | "endDate"): PeriodDate {
        return this._update({ [fieldName]: date });
    }

    updatedPeriods(periods: PeriodDetailsAttrs[]): PeriodDate {
        return this._update({ periods });
    }
}
