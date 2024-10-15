import { D2ApiLogs } from "$/data/D2ApiLogs";
import { FutureData } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { GetLogsOptions, LogRepository } from "$/domain/repositories/LogRepository";
import { D2Api } from "$/types/d2-api";

export class LogD2Repository implements LogRepository {
    private d2ApiLogs: D2ApiLogs;
    constructor(private api: D2Api) {
        this.d2ApiLogs = new D2ApiLogs(this.api);
    }

    getByDataSets(options: GetLogsOptions): FutureData<Log[]> {
        return this.d2ApiLogs.getByDate(options);
    }
}
