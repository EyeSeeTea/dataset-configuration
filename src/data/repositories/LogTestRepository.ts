import { FutureData } from "$/domain/entities/generic/Future";
import { Log } from "$/domain/entities/Log";
import { LogRepository } from "$/domain/repositories/LogRepository";

export class LogTestRepository implements LogRepository {
    save(_logs: Log[]): FutureData<void> {
        throw new Error("Method not implemented.");
    }
    getByDataSets(): FutureData<Log[]> {
        throw new Error("Method not implemented.");
    }
}
