import { DatePeriod } from "$/domain/entities/DatePeriod";
import { Id } from "$/domain/entities/Ref";

export type DataSetPeriodDate = {
    id: Id;
    name: string;
    periodDate: DatePeriod;
    outcomeDate: DatePeriod;
    outputDate: DatePeriod;
};
