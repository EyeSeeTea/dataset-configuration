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
            return this.getByIdentifiables(values);
        }).map(response => {
            return response.map((d2DataElement): DataElement => {
                return this.buildDataElement(d2DataElement);
            });
        });
    }

    private buildDataElement(d2DataElement: D2ApiDataElement): DataElement {
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
    }

    private getByIdentifiables(identifiables: string[]) {
        return apiToFuture(
            this.api.models.dataElements.get({
                fields: {
                    id: true,
                    displayName: true,
                    code: true,
                    categoryCombo: { id: true, displayName: true },
                },
                filter: { identifiable: { in: identifiables } },
                paging: false,
            })
        ).map(response => {
            return response.objects;
        });
    }
}

type D2ApiDataElement = {
    code: string;
    id: string;
    displayName: string;
    categoryCombo: { id: string; displayName: string };
};
