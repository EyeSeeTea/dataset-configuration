import { DataSet } from "$/domain/entities/DataSet";
import { ISODateString } from "$/domain/entities/Ref";
import { User } from "$/domain/entities/User";
import { Struct } from "$/domain/entities/generic/Struct";
import _ from "$/domain/entities/generic/Collection";
import i18n from "$/utils/i18n";

export type LogsAttrs = {
    date: ISODateString;
    action: LogAction;
    user: Pick<User, "id" | "username" | "name">;
    status: LogStatus;
    type: "dataSets";
    dataSets: Pick<DataSet, "id" | "name">[];
};

export type LogAction =
    | "sharing"
    | "orgunits"
    | "delete"
    | "edit"
    | "create"
    | "clone"
    | "unknown"
    | "period_dates";

export type LogStatus = "success" | "failed";
export type PartialLog = Pick<Log, "action" | "status">;

export class Log extends Struct<LogsAttrs>() {
    get actionDescription(): string {
        switch (this.action) {
            case "sharing":
                return i18n.t("change sharing settings");
            case "orgunits":
                return i18n.t("change organisation units");
            case "delete":
                return i18n.t("delete");
            case "edit":
                return i18n.t("edit dataset");
            case "create":
                return i18n.t("create new dataset");
            case "clone":
                return i18n.t("clone dataset");
            case "period_dates":
                return i18n.t("change period dates");
            default:
                return i18n.t("unknown action");
        }
    }

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

    static generateLogFromDataSets(dataSets: Log["dataSets"], user: User, log: PartialLog): Log {
        return Log.create({
            dataSets: dataSets.map(dataSet => {
                return { id: dataSet.id, name: dataSet.name };
            }),
            date: new Date().toISOString(),
            type: "dataSets",
            user: { id: user.id, name: user.name, username: user.username },
            ...log,
        });
    }
}
