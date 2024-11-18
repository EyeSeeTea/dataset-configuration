import { DataSet } from "$/domain/entities/DataSet";
import { ISODateString } from "$/domain/entities/Ref";
import { User } from "$/domain/entities/User";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";
import { Maybe } from "$/utils/ts-utils";

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
                .map((dataSet): Maybe<Log["dataSets"][number]> => {
                    const dataSetDetails = dataSets.find(ds => ds.id === dataSet.id);
                    if (!dataSetDetails) return undefined;
                    return { id: dataSet.id, shortName: dataSetDetails?.name || "" };
                })
                .compact()
                .value();
            return Log.create({ ...log, dataSets: logDataSets });
        });
    }
}
