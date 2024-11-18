import { DataSet } from "$/domain/entities/DataSet";
import { ISODateString } from "$/domain/entities/Ref";
import { User } from "$/domain/entities/User";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";

export type LogsAttrs = {
    date: ISODateString;
    actionDescription: string;
    action: "sharing" | "orgunits" | "delete" | "edit" | "create" | "clone" | "unknown";
    user: Pick<User, "id" | "username" | "name">;
    status: LogStatus;
    type: "dataSets";
    dataSets: Pick<DataSet, "id" | "shortName">[];
};

export type LogStatus = "success" | "failure";

export class Log extends Struct<LogsAttrs>() {
    static buildLogsWithDataSetDetails(dataSets: DataSet[], logs: Log[]): Log[] {
        return logs.map(log => {
            const logDataSets = _(log.dataSets)
                .compactMap(dataSet => {
                    return dataSets.find(ds => ds.id === dataSet.id);
                })
                .value();
            return Log.create({ ...log, dataSets: logDataSets });
        });
    }
}
