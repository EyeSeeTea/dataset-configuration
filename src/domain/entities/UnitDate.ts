import { Maybe, UnionFromValues } from "$/utils/ts-utils";

const unitDates = ["week", "month", "day"] as const;
export type UnitDate = UnionFromValues<typeof unitDates>;

export const DEFAULT_UNIT_DATE = "month" as const;

export function getUnitDateFromString(unitValue: string): Maybe<UnitDate> {
    return unitDates.find(ud => ud === unitValue);
}
