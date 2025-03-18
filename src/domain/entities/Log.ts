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

const ACTION_DESCRIPTIONS: Record<LogAction, string> = {
    sharing: i18n.t("change sharing settings"),
    orgunits: i18n.t("change organisation units"),
    delete: i18n.t("delete"),
    edit: i18n.t("edit dataset"),
    create: i18n.t("create new dataset"),
    clone: i18n.t("clone dataset"),
    period_dates: i18n.t("change period dates"),
    unknown: "",
};

export class Log extends Struct<LogsAttrs>() {
    get actionDescription(): string {
        return ACTION_DESCRIPTIONS[this.action] || i18n.t("unknown action");
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
            dataSets: dataSets,
            date: new Date().toISOString(),
            type: "dataSets",
            user: { id: user.id, name: user.name, username: user.username },
            ...log,
        });
    }
}
