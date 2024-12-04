import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Region } from "$/domain/entities/Region";
import { RegionRepository } from "$/domain/repositories/RegionRepository";
import { D2Api } from "$/types/d2-api";

export class RegionD2Repository implements RegionRepository {
    constructor(private _api: D2Api) {}

    get(): FutureData<Region[]> {
        return Future.success([]);
    }
}
