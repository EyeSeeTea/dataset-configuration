import { D2Api } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { Sharing } from "$/domain/entities/Sharing";
import { FutureData } from "$/domain/entities/generic/Future";

export class SharingD2Repository implements SharingRepository {
    constructor(private api: D2Api) {}

    getByName(name: string): FutureData<Sharing> {
        return apiToFuture(this.api.sharing.search({ key: name })).map(d2Response => {
            return Sharing.create({
                userAccesses: d2Response.users.map(user => {
                    return { id: user.id, name: user.displayName };
                }),
                userGroupAccesses: d2Response.userGroups.map(userGroup => {
                    return { id: userGroup.id, name: userGroup.displayName };
                }),
            });
        });
    }
}
