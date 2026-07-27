import { OrgUnit } from "$/domain/entities/DataSet";
import { FutureData } from "$/domain/entities/generic/Future";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";

export class OrgUnitTestRepository implements OrgUnitRepository {
    getByIds(): FutureData<OrgUnit[]> {
        throw new Error("Method not implemented.");
    }
}
