import { PeriodDate } from "$/domain/entities/PeriodDate";
import { Id } from "$/domain/entities/Ref";

export type DataSetPeriodDate = {
    id: Id;
    name: string;
    periodDate: PeriodDate;
    outcomeDate: PeriodDate;
    outputDate: PeriodDate;
};
