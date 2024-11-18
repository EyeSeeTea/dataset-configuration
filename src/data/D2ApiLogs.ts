import { FutureData, apiToFuture } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import { GetLogsOptions } from "$/domain/repositories/LogRepository";
import { D2Api } from "$/types/d2-api";
import i18n from "$/utils/i18n";
import { DataStore } from "@eyeseetea/d2-api/api";

const LOGS_NAMESPACE = "dataset-configuration";
const LOGS_PAGE_CURRENT_KEY = "logs-page-current";
const LOGS_PAGE_PREFIX = "logs-page-";

export class D2ApiLogs {
    private dataStore: DataStore;
    constructor(private api: D2Api) {
        this.dataStore = this.api.dataStore(LOGS_NAMESPACE);
    }

    getByDate(options: GetLogsOptions): FutureData<Log[]> {
        return this.getCurrentPage().flatMap(currentPage => {
            return apiToFuture(this.dataStore.get<D2Logs[]>(LOGS_PAGE_PREFIX + currentPage)).map(
                d2Logs => {
                    if (!d2Logs) return [];
                    const logs = d2Logs?.map(d2Log => this.buildLog(d2Log));
                    return logs.filter(log =>
                        log.dataSets.some(dataset => options.dataSetsIds?.includes(dataset.id))
                    );
                }
            );
        });
    }

    private buildLog(d2Log: D2Logs): Log {
        const action = this.buildActionFromLegacyDescription(d2Log.action);
        return Log.create({
            actionDescription: action.description,
            action: action.action,
            date: d2Log.date,
            status: d2Log.status,
            dataSets: d2Log.datasets.map(ds => ({ id: ds.id, shortName: "" })),
            type: "dataSets",
            user: {
                id: d2Log.user.id,
                name: d2Log.user.displayName,
                username: d2Log.user.username,
            },
        });
    }

    private buildActionFromLegacyDescription(description: string): D2LegacyAction {
        const action = legacyActionsNames[description];
        if (!action) return { description: "unknown action", action: "unknown" };
        return action;
    }

    private getCurrentPage(): FutureData<number> {
        return apiToFuture(this.dataStore.get<D2LogCurrentPage>(LOGS_PAGE_CURRENT_KEY)).flatMap(
            currentPage => {
                if (!currentPage) return Future.error(new Error("Error getting logs current page"));
                return Future.success(currentPage);
            }
        );
    }
}

export type D2LogCurrentPage = number;
export type D2Logs = {
    action: string;
    datasets: Array<{ id: Id }>;
    date: ISODateString;
    status: Log["status"];
    user: { displayName: string; id: Id; username: string };
};

export type D2LegacyAction = { action: Log["action"]; description: string };
const legacyActionsNames: Record<string, D2LegacyAction> = {
    "edit dataset": { action: "edit", description: i18n.t("edit dataset") },
    "create new dataset": { action: "create", description: i18n.t("create new dataset") },
    "change sharing settings": {
        action: "sharing",
        description: i18n.t("change sharing settings"),
    },
    delete: { action: "delete", description: "delete" },
    "change organisation units": {
        action: "orgunits",
        description: i18n.t("change organisation units"),
    },
    "clone dataset": { action: "clone", description: i18n.t("clone dataset") },
};
