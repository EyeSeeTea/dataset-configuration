import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { FutureData } from "$/domain/entities/generic/Future";
import { MasterLogFrameRepository } from "$/domain/repositories/MasterLogFrameRepository";

export class GetMasterLogFrameUseCase {
    constructor(private masterLogFrameRepository: MasterLogFrameRepository) {}

    execute(codes: string[]): FutureData<MasterLogFrame[]> {
        return this.masterLogFrameRepository.getByCode(codes);
    }
}
