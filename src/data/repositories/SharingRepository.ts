import { FutureData } from "$/data/api-futures";
import { Sharing } from "$/domain/entities/Sharing";

export interface SharingRepository {
    getBy(search: string): FutureData<Sharing>;
}
