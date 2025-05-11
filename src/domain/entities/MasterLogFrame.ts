import { IndicatorType } from "$/domain/entities/Indicator";
import { Id, Ref } from "$/domain/entities/Ref";

/**
 *
 * A Master Log Frame groups a set of indicators based on country and year.
 *
 * Example: MLF "Afghanistan MLF 2024" have indicators for Afghanistan for the year 2024.
 *
 * The main purpose of this right now is to allow the user to select a set of indicators quickly.
 * We don't need the country and year as attributes right now, but it might be useful in the future.
 *
 */
export type MasterLogFrame = {
    id: Id;
    name: string;
    type: IndicatorType;
    indicators: Ref[];
};
