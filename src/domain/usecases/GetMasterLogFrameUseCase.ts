import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { FutureData } from "$/domain/entities/generic/Future";
import { MasterLogFrameRepository } from "$/domain/repositories/MasterLogFrameRepository";

export class GetMasterLogFrameUseCase {
    constructor(private masterLogFrameRepository: MasterLogFrameRepository) {}

    execute(options: { codes: string[] }): FutureData<MasterLogFrame[]> {
        return this.masterLogFrameRepository.getByCode(options.codes);
    }
}
