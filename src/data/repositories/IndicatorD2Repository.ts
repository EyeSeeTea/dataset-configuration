import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { Config } from "$/domain/entities/Config";

export class IndicatorD2Repository implements IndicatorRepository {
    constructor(private _api: D2Api, private config: Config) {}

    get(): FutureData<Indicator[]> {
        return Future.success(this.config.indicators);
    }
}
