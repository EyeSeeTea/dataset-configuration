import { apiToFuture } from "$/data/api-futures";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { D2Api } from "$/types/d2-api";
import { chunkRequest } from "$/data/utils";
import { FutureData } from "$/domain/entities/generic/Future";
import { Maybe } from "$/utils/ts-utils";
import { D2ApiSharingFields } from "$/data/D2ApiSharing";

export class D2ApiCategoryOption {
    constructor(private api: D2Api) {}

    getByIds(ids: Id[]): FutureData<D2CategoryOptionTypeWithDates[]> {
        return chunkRequest(ids, categoryOptionsIds => {
            return apiToFuture(
                this.api.models.categoryOptions.get({
                    filter: { id: { in: categoryOptionsIds } },
                    fields: {
                        id: true,
                        code: true,
                        displayName: true,
                        startDate: true,
                        endDate: true,
                        lastUpdated: true,
                        sharing: {
                            external: true,
                            users: { id: true, displayName: true },
                            userGroups: { id: true, displayName: true },
                            public: true,
                        },
                    },
                    paging: false,
                })
            ).map(response => response.objects);
        });
    }
}

export type D2CategoryOptionType = {
    code: string;
    id: string;
    displayName: string;
    lastUpdated: ISODateString;
    sharing: D2ApiSharingFields;
};

export type D2CategoryOptionTypeWithDates = D2CategoryOptionType & {
    startDate: Maybe<ISODateString>;
    endDate: Maybe<ISODateString>;
};

export type D2CategoryOptionWithDatesOu = D2CategoryOptionTypeWithDates & {
    code: string;
    organisationUnits: { id: string; code: string; displayName: string; path: string }[];
};
