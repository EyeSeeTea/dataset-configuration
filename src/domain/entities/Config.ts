import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Indicator } from "$/domain/entities/Indicator";
import { Region } from "$/domain/entities/Region";
import { UserGroup } from "$/domain/entities/UserGroup";

export type Config = {
    categoryCombinations: CategoryCombination[];
    indicators: Indicator[];
    regions: Region[];
    userGroups: UserGroup[];
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    periodLastYearUnits: string;
    notificationUserGroup: UserGroup;
};
