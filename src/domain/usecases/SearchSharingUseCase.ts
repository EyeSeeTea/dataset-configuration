import { FutureData } from "$/data/api-futures";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { Sharing } from "$/domain/entities/Sharing";

export class SearchSharingUseCase {
    constructor(private sharingRepository: SharingRepository) {}

    execute(search: string): FutureData<Sharing> {
        return this.sharingRepository.getBy(search);
    }
}
