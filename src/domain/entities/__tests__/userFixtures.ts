import { User, UserRole } from "$/domain/entities/User";
import { NamedRef } from "$/domain/entities/Ref";

export function createAdminUser(): User {
    const adminRoles = [{ id: "Hg7n0MwzUQn", name: "Super user", authorities: ["ALL"] }];

    return createUser(adminRoles, []);
}
export function createNonAdminUser(): User {
    const nonAdminRoles = [{ id: "Hg7n0MwzUQn", name: "Malaria", authorities: ["F_EXPORT_DATA"] }];

    return createUser(nonAdminRoles, []);
}
export function createUserWithGroups(userGroups: NamedRef[] = []): User {
    return new User({
        id: "YjJdEO6d38H",
        name: "John Traore",
        username: "user",
        userRoles: [],
        userGroups,
        access: {
            canCreatePublicDataSets: true,
            canDeleteDataSets: true,
            canCreateDataSets: true,
            canEditCombinations: true,
        },
        orgUnits: [],
    });
}
function createUser(userRoles: UserRole[], userGroups: NamedRef[] = []): User {
    return new User({
        orgUnits: [],
        id: "kQiwoyMYHBS",
        name: "John Traore",
        username: "user",
        userRoles,
        userGroups,
        access: {
            canDeleteDataSets: true,
            canCreatePublicDataSets: true,
            canCreateDataSets: true,
            canEditCombinations: true,
        },
    });
}
