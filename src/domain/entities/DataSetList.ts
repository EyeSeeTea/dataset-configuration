import { DataSet } from "$/domain/entities/DataSet";
import { User } from "$/domain/entities/User";
import { Struct } from "$/domain/entities/generic/Struct";

export type DataSetListAttrs = Pick<
    DataSet,
    "id" | "name" | "lastUpdated" | "permissions" | "canBeUpdated"
>;

export class DataSetList extends Struct<DataSetListAttrs>() {
    get isPublic(): boolean {
        return this.permissions.metadata.read;
    }

    get isPrivate(): boolean {
        return !this.isPublic;
    }

    hasPermissionsToUpdate(user: User): boolean {
        const nonPrivateOrUseHasAccess = !this.isPrivate || user.access.canCreateDataSets;
        const nonPublicOrUserHasAccess = !this.isPublic || user.access.canCreatePublicDataSets;
        return this.canBeUpdated && nonPrivateOrUseHasAccess && nonPublicOrUserHasAccess;
    }
}
