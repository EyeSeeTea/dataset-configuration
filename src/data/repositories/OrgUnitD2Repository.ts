import { D2Api } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { OrgUnit } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { FutureData } from "$/domain/entities/generic/Future";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { chunkRequest } from "$/data/utils";

export class OrgUnitD2Repository implements OrgUnitRepository {
    constructor(private api: D2Api) {}

    getByIds(ids: Id[]): FutureData<OrgUnit[]> {
        const d2OrgsUnits$ = chunkRequest<D2OrgUnit>(ids, idsToFetch => {
            return apiToFuture(
                this.api.models.organisationUnits.get({
                    fields: { id: true, displayName: true, path: true },
                    filter: { id: { in: idsToFetch } },
                    paging: false,
                })
            ).map(response => response.objects);
        });

        return d2OrgsUnits$.map(d2OrgUnits => {
            return d2OrgUnits.map(d2OrgUnit => {
                return {
                    id: d2OrgUnit.id,
                    name: d2OrgUnit.displayName,
                    path: d2OrgUnit.path.split("/").slice(1),
                };
            });
        });
    }
}

type D2OrgUnit = { id: string; displayName: string; path: string };
