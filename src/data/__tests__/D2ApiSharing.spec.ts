import { D2ApiSharing } from "$/data/D2ApiSharing";
import { Permission } from "$/domain/entities/Permission";
import { swAccessGroups } from "$/domain/entities/__tests__/sharingFixtures";

describe("D2ApiSharing", () => {
    it("should generate non-empty userGroups from access copied from the project sharing", () => {
        const d2ApiSharing = new D2ApiSharing();

        const result = d2ApiSharing.generateSharingData({
            access: swAccessGroups,
            permissions: Permission.noPermissions(),
        });

        expect(result.userGroups).toEqual({
            OCFhIi9THVW: {
                id: "OCFhIi9THVW",
                displayName: "SW_Administrators",
                access: "r-rw----",
            },
            VASLT4IGA6c: {
                id: "VASLT4IGA6c",
                displayName: "SW_Users",
                access: "r-rw----",
            },
        });
        expect(result.users).toEqual({});
    });
});
