import { OrgUnit } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";

export class GetOrgUnitsByIdsUseCase {
    constructor(private orgUnitRepository: OrgUnitRepository) {}

    public execute(ids: Id[]): FutureData<OrgUnit[]> {
        return this.orgUnitRepository.getByIds(ids);
    }
}
