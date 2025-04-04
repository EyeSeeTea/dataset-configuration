import { apiToFuture } from "$/data/api-futures";
import { Id } from "$/domain/entities/Ref";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";

export class D2ApiCategoryCombo {
    constructor(private api: D2Api) {}

    getByIds(ids: Id[]): FutureData<D2ApiCategoryComboType[]> {
        if (ids.length === 0) return Future.success([]);

        return apiToFuture(
            this.api.models.categoryCombos.get({
                fields: {
                    id: true,
                    displayName: true,
                    categories: {
                        id: true,
                        displayName: true,
                        categoryOptions: { id: true, displayName: true },
                    },
                    categoryOptionCombos: {
                        categoryOptions: { id: true, displayName: true },
                        displayName: true,
                        id: true,
                    },
                },
                filter: {
                    id: { in: ids },
                    dataDimensionType: { eq: "DISAGGREGATION" },
                },
            })
        ).map(d2Response => d2Response.objects);
    }
}

export type D2ApiCategoryComboType = {
    id: Id;
    displayName: string;
    categories: Array<{
        id: Id;
        displayName: string;
        categoryOptions: Array<{ id: Id; displayName: string }>;
    }>;
    categoryOptionCombos: Array<{
        id: Id;
        displayName: string;
        categoryOptions: Array<{ id: Id; displayName: string }>;
    }>;
};
