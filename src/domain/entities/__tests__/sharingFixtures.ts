import { AccessData } from "$/domain/entities/DataSet";
import { Permission, Permissions } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { getUid } from "$/utils/uid";

export const swSharingPermissions: Permissions = {
    data: Permission.create({ read: true, write: true }),
    metadata: Permission.create({ read: true, write: false }),
};

export const swAccessGroups: AccessData[] = [
    {
        id: "OCFhIi9THVW",
        name: "SW_Administrators",
        type: "groups",
        permissions: swSharingPermissions,
    },
    {
        id: "VASLT4IGA6c",
        name: "SW_Users",
        type: "groups",
        permissions: swSharingPermissions,
    },
];

export const swUserAccess: AccessData = {
    id: "swUserId",
    name: "John Doe",
    type: "users",
    permissions: swSharingPermissions,
};

// SW has no matching region in configTest, so region derivation gives an empty result
export const projectWithoutRegionTest = createProject("SWFM2604", [
    ...swAccessGroups,
    swUserAccess,
]);
export const projectWithoutGroupsTest = createProject("GL_CatO:CRFM", [swUserAccess]);

export function createProject(code: string, access: AccessData[]): Project {
    return Project.create({
        id: getUid(code),
        name: `Test Project ${code}`,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        code,
        lastUpdated: new Date().toISOString(),
        orgsUnits: [],
        dataSets: [],
        access,
    });
}
