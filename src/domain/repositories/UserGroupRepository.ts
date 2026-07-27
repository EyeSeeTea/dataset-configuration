import { UserGroup } from "$/domain/entities/UserGroup";
import { FutureData } from "$/domain/entities/generic/Future";

export interface UserGroupRepository {
    getByNames(names: string[]): FutureData<UserGroup[]>;
}
