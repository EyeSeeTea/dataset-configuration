import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Indicator } from "$/domain/entities/Indicator";
import { Region } from "$/domain/entities/Region";
import { UserGroup } from "$/domain/entities/UserGroup";
import { Maybe } from "$/utils/ts-utils";
import { UnitDate } from "$/domain/entities/UnitDate";

export type Config = {
    categoryCombinations: CategoryCombination[];
    indicators: Indicator[];
    regions: Region[];
    userGroups: UserGroup[];
    periodEndDateMonth: number;
    periodEndDateDay: number;
    periodLastYearEndDate: number;
    notificationUserGroup: Maybe<UserGroup>;
    periodLastYearUnits: UnitDate;
};
