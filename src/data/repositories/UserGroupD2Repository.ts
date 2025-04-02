import { apiToFuture } from "$/data/api-futures";
import { UserGroup } from "$/domain/entities/UserGroup";
import { FutureData } from "$/domain/entities/generic/Future";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { D2Api } from "$/types/d2-api";

export class UserGroupD2Repository implements UserGroupRepository {
    constructor(private api: D2Api) {}

    getByNames(names: string[]): FutureData<UserGroup[]> {
        return apiToFuture(
            this.api.models.userGroups.get({
                fields: { id: true, displayName: true, code: true },
                filter: {
                    name: { in: names },
                },
                paging: false,
            })
        ).map(d2Response =>
            d2Response.objects.map(d2UserGroup => ({
                id: d2UserGroup.id,
                code: d2UserGroup.code,
                name: d2UserGroup.displayName,
            }))
        );
    }
}
