import { D2ApiSharing } from "$/data/D2ApiSharing";
import { AccessData } from "$/domain/entities/DataSet";
import { Permission, Permissions } from "$/domain/entities/Permission";

const sharingPermissions: Permissions = {
    data: Permission.create({ read: true, write: true }),
    metadata: Permission.create({ read: true, write: false }),
};

const fallbackAccess: AccessData[] = [
    {
        id: "swAdminGroupId",
        name: "SW_Administrators",
        type: "groups",
        permissions: sharingPermissions,
    },
    {
        id: "swUsersGroupId",
        name: "SW_Users",
        type: "groups",
        permissions: sharingPermissions,
    },
];

describe("D2ApiSharing", () => {
    it("should generate non-empty userGroups from access copied from the project sharing", () => {
        const d2ApiSharing = new D2ApiSharing();

        const result = d2ApiSharing.generateSharingData({
            access: fallbackAccess,
            permissions: Permission.noPermissions(),
        });

        expect(result.userGroups).toEqual({
            swAdminGroupId: {
                id: "swAdminGroupId",
                displayName: "SW_Administrators",
                access: "r-rw----",
            },
            swUsersGroupId: {
                id: "swUsersGroupId",
                displayName: "SW_Users",
                access: "r-rw----",
            },
        });
        expect(result.users).toEqual({});
    });
});
