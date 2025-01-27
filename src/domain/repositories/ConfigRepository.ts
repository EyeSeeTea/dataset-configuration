import { Config } from "$/domain/entities/Config";
import { FutureData } from "$/domain/entities/generic/Future";

export interface ConfigRepository {
    get(): FutureData<Config>;
}
