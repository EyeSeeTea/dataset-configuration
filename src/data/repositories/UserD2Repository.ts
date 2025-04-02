import { User } from "$/domain/entities/User";
import { UserRepository } from "$/domain/repositories/UserRepository";
import { D2Api, MetadataPick } from "$/types/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { FutureData } from "$/domain/entities/generic/Future";

export class UserD2Repository implements UserRepository {
    constructor(private api: D2Api) {}

    public getCurrent(): FutureData<User> {
        return apiToFuture(this.api.currentUser.get({ fields: userFields })).map(d2User => {
            const res = this.buildUser(d2User);
            return res;
        });
    }

    private buildUser(d2User: D2User) {
        const allAuthorities = d2User.userCredentials.userRoles.flatMap(
            ({ authorities }) => authorities
        );

        const isAdmin = allAuthorities.some(authority => authorities.admin.includes(authority));

        const hasAccess = (requiredAuthorities: string[]) =>
            isAdmin || requiredAuthorities.every(authority => allAuthorities.includes(authority));

        return new User({
            id: d2User.id,
            name: d2User.displayName,
            userGroups: d2User.userGroups,
            ...d2User.userCredentials,
            access: {
                canCreatePublicDataSets: hasAccess(authorities.dataSets.createPublic),
                canDeleteDataSets: hasAccess(authorities.dataSets.delete),
                canCreateDataSets: hasAccess(authorities.dataSets.create),
                canEditCombinations: hasAccess(authorities.categoryCombo.edit),
            },
        });
    }
}

const userFields = {
    id: true,
    displayName: true,
    userGroups: { id: true, name: true },
    userCredentials: {
        username: true,
        userRoles: { id: true, name: true, authorities: true },
    },
} as const;

type D2User = MetadataPick<{ users: { fields: typeof userFields } }>["users"][number];

export const authorities = {
    admin: ["ALL"],
    categoryCombo: { edit: ["F_CATEGORY_COMBO_PUBLIC_ADD"] },
    dataSets: {
        createPublic: ["F_DATASET_PUBLIC_ADD"],
        create: ["F_SECTION_DELETE", "F_SECTION_ADD", "F_DATASET_PRIVATE_ADD"],
        delete: [
            "F_DATASET_DELETE",
            "F_SECTION_DELETE",
            "F_INDICATOR_PUBLIC_ADD",
            "F_INDICATOR_PRIVATE_ADD",
        ],
    },
};
