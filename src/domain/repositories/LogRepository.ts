import { FutureData } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { Id } from "$/domain/entities/Ref";

export interface LogRepository {
    getByDataSets(options: GetLogsOptions): FutureData<Log[]>;
}

export type GetLogsOptions = { dataSetsIds: Id[] };
