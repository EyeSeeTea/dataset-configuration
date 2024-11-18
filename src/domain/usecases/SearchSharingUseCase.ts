import { FutureData } from "$/domain/entities/generic/Future";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { Sharing } from "$/domain/entities/Sharing";

export class SearchSharingUseCase {
    constructor(private sharingRepository: SharingRepository) {}

    execute(name: string): FutureData<Sharing> {
        return this.sharingRepository.getByName(name);
    }
}
