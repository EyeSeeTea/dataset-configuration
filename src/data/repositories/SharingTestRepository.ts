import { FutureData } from "$/data/api-futures";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { Sharing } from "$/domain/entities/Sharing";

export class SharingTestRepository implements SharingRepository {
    getBy(): FutureData<Sharing> {
        throw new Error("Method not implemented.");
    }
}
