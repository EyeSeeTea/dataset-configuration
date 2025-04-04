import { DataElement } from "$/domain/entities/DataElement";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";

export class GetDataElementsByIdsUseCase {
    constructor(private dataElementRepository: DataElementRepository) {}

    execute(options: Options): FutureData<DataElement[]> {
        return this.dataElementRepository.getBy(options.dataElementsIds);
    }
}

type Options = { dataElementsIds: Id[] };
