import { ISODateString } from "$/domain/entities/Ref";

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

export function addToDate(
    date: string,
    units: "years" | "months" | "days",
    unitValue: number
): string {
    if (!date) return date;
    const newDate = new Date(date);

    switch (units) {
        case "years":
            newDate.setFullYear(newDate.getFullYear() + unitValue);
            break;
        case "months":
            newDate.setMonth(newDate.getMonth() + unitValue);
            break;
        case "days":
            newDate.setDate(newDate.getDate() + unitValue);
            break;
        default:
            throw new Error("Unidad no válida");
    }

    return newDate.toISOString();
}
