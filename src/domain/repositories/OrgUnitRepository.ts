import { OrgUnit } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";

export interface OrgUnitRepository {
    getByIds(ids: Id[]): FutureData<OrgUnit[]>;
}
