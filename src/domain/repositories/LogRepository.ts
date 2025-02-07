import { FutureData } from "$/domain/entities/generic/Future";
import { Log } from "$/domain/entities/Log";
import { Id } from "$/domain/entities/Ref";

export interface LogRepository {
    getByDataSets(options: GetLogsOptions): FutureData<Log[]>;
    save(logs: Log[]): FutureData<void>;
}

export type GetLogsOptions = { page?: number; dataSetsIds: Id[] };
