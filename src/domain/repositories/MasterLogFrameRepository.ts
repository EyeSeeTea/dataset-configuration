import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { FutureData } from "$/domain/entities/generic/Future";

export interface MasterLogFrameRepository {
    getByCode(codes: string[]): FutureData<MasterLogFrame[]>;
}
