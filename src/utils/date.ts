import { ISODateString } from "$/domain/entities/Ref";
import { UnitDate } from "$/domain/entities/UnitDate";
import i18n from "$/utils/i18n";
import { DropdownItem } from "@eyeseetea/d2-ui-components";
import { Maybe } from "$/utils/ts-utils";

export function toLongDateString(isoDate: ISODateString, options?: Intl.DateTimeFormatOptions) {
    return new Date(isoDate).toLocaleString("default", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        ...options,
    });
}

export function addToDate(date: string, units: UnitDate, unitValue: number): string {
    if (!date) return date;
    const newDate = new Date(date);

    switch (units) {
        case "week":
            newDate.setDate(newDate.getDate() + unitValue * 7);
            break;
        case "month":
            newDate.setMonth(newDate.getMonth() + unitValue);
            break;
        case "day":
            newDate.setDate(newDate.getDate() + unitValue);
            break;
        default:
            throw new Error("Invalid Date Unit");
    }

    return newDate.toISOString();
}

export function getDiff(dateA: Date, dateB: Date, unit: UnitDate): number {
    const diffTime = dateB.getTime() - dateA.getTime();

    switch (unit) {
        case "day":
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        case "month": {
            let monthDiff =
                12 * (dateB.getFullYear() - dateA.getFullYear()) +
                dateB.getMonth() -
                dateA.getMonth();
            if (dateA !== dateB) {
                const dateADay = dateA.getDate();
                const dateBDay = dateB.getDate();
                const daysInCurrentMonth = new Date(
                    dateA.getFullYear(),
                    dateA.getMonth() + 1,
                    0
                ).getDate();
                const dayFraction = (dateBDay - dateADay) / daysInCurrentMonth;
                monthDiff += dayFraction;
            }
            return monthDiff;
        }
        case "week":
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        default:
            throw new Error("Invalid Date Unit");
    }
}

export function getMonths() {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => ({
        text: new Intl.DateTimeFormat("default", { month: "long" }).format(
            new Date(currentYear, i, 1)
        ),
        value: String(i + 1),
    }));
}

export function getUnits() {
    return [
        { text: i18n.t("Day"), value: "day" },
        { text: i18n.t("Month"), value: "month" },
        { text: i18n.t("Year"), value: "year" },
    ];
}

export function getDaysPerMonthYear(
    month: number,
    year: number = new Date().getFullYear()
): DropdownItem[] {
    if (month === 0) return [];
    const numDays = new Date(year, month, 0).getDate();

    return Array.from({ length: numDays }, (_, index) => ({
        text: String(index + 1),
        value: String(index + 1),
    }));
}

export function toISODateWithoutTimezone(date: Date) {
    const dateParts = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ];
    return dateParts.join("-") + "T00:00:00.000";
}

export function stringToTime(dateStr: Maybe<string>): Maybe<number> {
    const time = dateStr ? new Date(dateStr).getTime() : NaN;
    return isNaN(time) ? undefined : time;
}
