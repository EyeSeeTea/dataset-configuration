import { apiToFuture } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { GetLogsOptions } from "$/domain/repositories/LogRepository";
import { D2Api } from "$/types/d2-api";
import { DataStore } from "@eyeseetea/d2-api/api";
import _ from "$/domain/entities/generic/Collection";
import { D2LogsCodec } from "$/data/LogCodec";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";

const LOGS_NAMESPACE = "dataset-configuration";
const LOGS_PAGE_CURRENT_KEY = "logs-page-current";
const LOGS_PAGE_PREFIX = "logs-page-";
const MAX_LOGS_PAGES = 100;
const MAX_LOGS_PER_PAGE = 200;

export class D2ApiLogs {
    private dataStore: DataStore;
    constructor(private api: D2Api) {
        this.dataStore = this.api.dataStore(LOGS_NAMESPACE);
    }

    getByDate(options: GetLogsOptions): FutureData<Log[]> {
        const { page = 0 } = options;
        return this.getCurrentPage().flatMap(currentPage => {
            return Future.joinObj({
                logsCurrent: this.getLogs(currentPage - page, options.dataSetsIds),
                logsPrevious: this.getLogs(currentPage - page - 1, options.dataSetsIds),
            }).map(({ logsCurrent, logsPrevious }) => {
                return _(logsCurrent.concat(logsPrevious))
                    .sortBy(log => log.date)
                    .reverse()
                    .value();
            });
        });
    }

    save(logs: Log[]): FutureData<void> {
        return this.getCurrentPage().flatMap(currentPage => {
            return this.getLogs(currentPage, []).flatMap(existingLogs => {
                const nextCurrentPage =
                    logs.length < MAX_LOGS_PER_PAGE
                        ? currentPage
                        : this.getNextPage(currentPage + 1, MAX_LOGS_PAGES);

                return Future.joinObj({
                    saveLogsPage: this.saveLogsPage(
                        nextCurrentPage,
                        this.mapLogsToD2Logs(existingLogs.concat(logs))
                    ),
                    updateCurrentPage: this.saveNewLogsPage(currentPage, nextCurrentPage),
                }).toVoid();
            });
        });
    }

    private mapLogsToD2Logs(logs: Log[]): D2Logs[] {
        return logs.map((log): D2Logs => {
            return {
                action: log.actionDescription,
                date: log.date,
                status: log.status,
                user: {
                    displayName: log.user.name,
                    id: log.user.id,
                    username: log.user.username,
                },
                datasets: log.dataSets.map(dataSet => ({
                    id: dataSet.id,
                    displayName: dataSet.name,
                })),
            };
        });
    }

    private saveNewLogsPage(currentPage: number, nextPage: number): FutureData<void> {
        if (nextPage === currentPage) return Future.void();
        return Future.joinObj({
            updateCurrentPage: this.updateCurrentPage(nextPage),
            saveLogsPage: this.saveLogsPage(nextPage, []),
        }).toVoid();
    }

    private saveLogsPage(page: number, logs: D2Logs[]): FutureData<void> {
        return apiToFuture(this.dataStore.save(LOGS_PAGE_PREFIX + page, logs));
    }

    private updateCurrentPage(page: number): FutureData<void> {
        return apiToFuture(this.dataStore.save(LOGS_PAGE_CURRENT_KEY, page as unknown as object));
    }

    private getLogs(page: number, dataSetsIds: Id[]): FutureData<Log[]> {
        const nextPage = this.getNextPage(page, MAX_LOGS_PAGES);
        const pageToFetch = nextPage < 0 ? MAX_LOGS_PAGES - 1 : nextPage;
        return apiToFuture(this.dataStore.get<D2Logs[]>(LOGS_PAGE_PREFIX + pageToFetch)).flatMap(
            d2Logs => {
                if (!d2Logs) return Future.success([]);
                const errors = this.getErrors(d2Logs);

                if (errors.length > 0) {
                    console.error("Error getting logs", errors);
                }

                const logs = _(d2Logs)
                    .compactMap(d2Log => this.buildLog(d2Log))
                    .value();

                const filterLogs =
                    dataSetsIds.length > 0
                        ? logs.filter(log =>
                              log.dataSets.some(dataset => dataSetsIds.includes(dataset.id))
                          )
                        : logs;

                return Future.success(filterLogs);
            }
        );
    }

    private getLegacyActionsNames(): Record<string, D2LegacyAction> {
        return {
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
            "change period dates": { action: "period_dates", description: i18n.t("period dates") },
        };
    }

    private getErrors(d2Logs: D2Logs[]): string[] {
        const logsValidation = d2Logs.map(d2Log => D2LogsCodec.decode(d2Log));
        const errors = _(logsValidation)
            .compactMap(either => {
                const value = either.leftOrDefault("");
                return value ? value : undefined;
            })
            .value();
        return errors;
    }

    private buildLog(d2Log: D2Logs): Maybe<Log> {
        if (d2Log.datasets.some(ds => !ds.id)) return undefined;
        const action = this.buildActionFromLegacyDescription(d2Log.action);
        return Log.create({
            action: action.action,
            date: d2Log.date,
            status: d2Log.status,
            dataSets: d2Log.datasets.map(ds => ({ id: ds.id, name: ds.displayName })),
            type: "dataSets",
            user: {
                id: d2Log.user.id,
                name: d2Log.user.displayName,
                username: d2Log.user.username,
            },
        });
    }

    private buildActionFromLegacyDescription(description: string): D2LegacyAction {
        const actionNames = this.getLegacyActionsNames();
        const action = actionNames[description];
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

    private getNextPage(currentPage: number, maxLogPages: number): number {
        return ((currentPage % maxLogPages) + maxLogPages) % maxLogPages;
    }
}

export type D2LogCurrentPage = number;
export type D2Logs = {
    action: string;
    datasets: Array<{ id: Id; displayName: string }>;
    date: ISODateString;
    status: Log["status"];
    user: { displayName: string; id: Id; username: string };
};

export type D2LegacyAction = { action: Log["action"]; description: string };
