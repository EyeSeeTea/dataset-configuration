import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Indicator } from "$/domain/entities/Indicator";
import { NamedCodeRef } from "$/domain/entities/Ref";
import { Region } from "$/domain/entities/Region";

export type UserGroup = NamedCodeRef;

export type Config = {
    categoryCombinations: CategoryCombination[];
    indicators: Indicator[];
    regions: Region[];
    userGroups: UserGroup[];
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    periodLastYearUnits: string;
};
