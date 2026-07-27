import { Struct } from "./generic/Struct";
import { NamedRef, Ref } from "./Ref";

export interface UserAttrs {
    id: string;
    name: string;
    username: string;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    access: {
        canCreatePublicDataSets: boolean;
        canCreateDataSets: boolean;
        canEditCombinations: boolean;
        canDeleteDataSets: boolean;
    };
    orgUnits: Ref[];
}

export interface UserRole extends NamedRef {
    authorities: string[];
}

export class User extends Struct<UserAttrs>() {
    get orgUnitIds() {
        return this.orgUnits.map(({ id }) => id);
    }

    belongToUserGroup(userGroupUid: string): boolean {
        return this.userGroups.some(({ id }) => id === userGroupUid);
    }

    isAdmin(): boolean {
        return this.userRoles.some(({ authorities }) => authorities.includes("ALL"));
    }
}
