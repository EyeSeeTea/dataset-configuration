import { FutureData, apiToFuture } from "$/data/api-futures";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";

export class D2ApiCategoryOption {
    constructor(private api: D2Api) {}

    getByIds(ids: Id[]): FutureData<D2CategoryOptionType[]> {
        return Future.sequential(
            _(ids)
                .chunk(50)
                .map(categoryOptionsIds => {
                    return apiToFuture(
                        this.api.models.categoryOptions.get({
                            filter: { id: { in: categoryOptionsIds } },
                            fields: { id: true, displayName: true, lastUpdated: true },
                            paging: false,
                        })
                    );
                })
                .value()
        ).map(d2Request => {
            return d2Request.flatMap(d2Response => d2Response.objects);
        });
    }
}

export type D2CategoryOptionType = { id: string; displayName: string; lastUpdated: ISODateString };
