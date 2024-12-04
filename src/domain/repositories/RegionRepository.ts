import { Region } from "$/domain/entities/Region";
import { FutureData } from "$/domain/entities/generic/Future";

export interface RegionRepository {
    get(): FutureData<Region[]>;
}
