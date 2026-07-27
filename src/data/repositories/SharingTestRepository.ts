import { FutureData } from "$/domain/entities/generic/Future";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { Sharing } from "$/domain/entities/Sharing";

export class SharingTestRepository implements SharingRepository {
    getByName(): FutureData<Sharing> {
        throw new Error("Method not implemented.");
    }
}
