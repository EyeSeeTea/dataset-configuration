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
