import { apiToFuture } from "$/data/api-futures";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { chunkRequest } from "$/data/utils";
import { FutureData } from "$/domain/entities/generic/Future";

export class D2ApiCategoryOption {
    constructor(private api: D2Api) {}

    getByIds(ids: Id[]): FutureData<D2CategoryOptionType[]> {
        return chunkRequest(ids, categoryOptionsIds => {
            return apiToFuture(
                this.api.models.categoryOptions.get({
                    filter: { id: { in: categoryOptionsIds } },
                    fields: { id: true, displayName: true, lastUpdated: true },
                    paging: false,
                })
            ).map(response => response.objects);
        });
    }
}

export type D2CategoryOptionType = { id: string; displayName: string; lastUpdated: ISODateString };
