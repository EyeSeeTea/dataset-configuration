import { FutureData } from "$/domain/entities/generic/Future";
import { Log } from "$/domain/entities/Log";
import { LogRepository } from "$/domain/repositories/LogRepository";

export class LogTestRepository implements LogRepository {
    getByDataSets(): FutureData<Log[]> {
        throw new Error("Method not implemented.");
    }
}
