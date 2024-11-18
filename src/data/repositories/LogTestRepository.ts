import { FutureData } from "$/data/api-futures";
import { Log } from "$/domain/entities/Log";
import { LogRepository } from "$/domain/repositories/LogRepository";

export class LogTestRepository implements LogRepository {
    getByDataSets(): FutureData<Log[]> {
        throw new Error("Method not implemented.");
    }
}
