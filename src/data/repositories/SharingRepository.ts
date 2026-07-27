import { FutureData } from "$/domain/entities/generic/Future";
import { Sharing } from "$/domain/entities/Sharing";

export interface SharingRepository {
    getByName(name: string): FutureData<Sharing>;
}
