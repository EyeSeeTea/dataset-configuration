import { apiToFuture } from "$/data/api-futures";
import { chunkRequest } from "$/data/utils";
import { DataElement } from "$/domain/entities/DataElement";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";
import { D2Api } from "$/types/d2-api";

export class DataElementD2Repository implements DataElementRepository {
    constructor(private api: D2Api) {}

    getBy(identifiables: string[]): FutureData<DataElement[]> {
        if (identifiables.length === 0) return Future.success([]);

        return chunkRequest(identifiables, values => {
            return apiToFuture(
                this.api.models.dataElements.get({
                    fields: {
                        id: true,
                        displayName: true,
                        code: true,
                        categoryCombo: { id: true, displayName: true },
                    },
                    filter: { identifiable: { in: values } },
                    paging: false,
                })
            ).map(response => {
                return response.objects;
            });
        }).map(response => {
            return response.map((d2DataElement): DataElement => {
                return {
                    code: d2DataElement.code,
                    id: d2DataElement.id,
                    name: d2DataElement.displayName,
                    disaggregation: d2DataElement.categoryCombo
                        ? {
                              id: d2DataElement.categoryCombo.id,
                              name: d2DataElement.categoryCombo.displayName,
                          }
                        : undefined,
                };
            });
        });
    }
}
