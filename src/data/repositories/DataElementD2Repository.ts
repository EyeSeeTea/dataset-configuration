import { apiToFuture } from "$/data/api-futures";
import { D2CategoryCombo, chunkRequest, convertToCategories } from "$/data/utils";
import { COMMENT_SUFIX, DataElement } from "$/domain/entities/DataElement";
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
            valueType: d2DataElement.valueType,
            description: d2DataElement.displayDescription,
            code: d2DataElement.code,
            id: d2DataElement.id,
            name: d2DataElement.displayName,
            isComment: d2DataElement.code.endsWith(COMMENT_SUFIX),
            categories: [],
            disaggregation: d2DataElement.categoryCombo
                ? {
                      id: d2DataElement.categoryCombo.id,
                      name: d2DataElement.categoryCombo.displayName,
                      categories: convertToCategories(d2DataElement.categoryCombo.categories),
                      optionsCombos: d2DataElement.categoryCombo.categoryOptionCombos.map(coc => ({
                          id: coc.id,
                          name: coc.displayName,
                          categoryCombo: { id: "" },
                          options: [],
                      })),
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
                    valueType: true,
                    displayDescription: true,
                    categoryCombo: {
                        id: true,
                        displayName: true,
                        categories: {
                            id: true,
                            name: true,
                            displayName: true,
                            categoryOptions: { id: true, displayName: true },
                        },
                        categoryOptionCombos: { id: true, displayName: true },
                    },
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
    valueType: string;
    displayDescription: string;
    code: string;
    id: string;
    displayName: string;
    categoryCombo: D2CategoryCombo;
};
