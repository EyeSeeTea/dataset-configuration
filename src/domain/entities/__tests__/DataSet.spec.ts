import { AccessData, DataSet, DataSetAttrs } from "$/domain/entities/DataSet";
import { Permission, Permissions } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { getErrorMessageFromErrors } from "$/domain/entities/generic/Error";
import { configTest } from "$/utils/tests";
import { Maybe } from "$/utils/ts-utils";
import { getUid } from "$/utils/uid";

const projectTest: Project = Project.create({
    id: getUid(new Date().getTime().toString()),
    name: "Test Project Afghanistan",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    code: "AFFE1507",
    lastUpdated: new Date().toISOString(),
    orgsUnits: [],
    dataSets: [],
    access: [
        {
            id: "",
            name: "AF_Administrators",
            type: "groups",
            permissions: Permission.noPermissions(),
        },
        {
            id: "",
            name: "AF_Users",
            type: "groups",
            permissions: Permission.noPermissions(),
        },
    ],
});

const swSharingPermissions: Permissions = {
    data: Permission.create({ read: true, write: true }),
    metadata: Permission.create({ read: true, write: false }),
};

const swAccessGroups: AccessData[] = [
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

const swUserAccess: AccessData = {
    id: "swUserId",
    name: "John Doe",
    type: "users",
    permissions: swSharingPermissions,
};

// SW has no matching region in configTest, so region derivation gives an empty result
const projectWithoutRegionTest = createProject("SWFM2604", [...swAccessGroups, swUserAccess]);
const projectWithoutGroupsTest = createProject("GL_CatO:CRFM", [swUserAccess]);

describe("DataSet", () => {
    it("should throw an error if project and org. units are not present", async () => {
        const dataSetToSave = createDataSet({ project: projectTest, orgUnits: [] }).updateProject(
            undefined,
            configTest
        );

        const errors = dataSetToSave.validateRegionCodes();
        const errorMessage = getErrorMessageFromErrors(errors);
        expect(errors.length).toBeGreaterThan(0);
        expect(errorMessage).toMatch("Select at least one country");
    });

    it("should have access groups if org. units is present and project is not defined", async () => {
        const dataSetToSave = createDataSet({
            name: "Test DataSet",
            indicators: [],
            project: undefined,
            orgUnits: [
                {
                    id: "gEcRYGMcEbO",
                    code: "NRC",
                    name: "NRC",
                    path: [],
                },
                {
                    id: "ISeK6bTD3hr",
                    code: "AF_AO_Central",
                    name: "AF_AO_Central (Kabul)",
                    path: [],
                },
            ],
        }).updateAccess(configTest);

        const result = dataSetToSave.validateRegionCodes();
        expect(result).toHaveLength(0);

        expectUserGroups(dataSetToSave);
    });

    it("should have access groups from project access groups", async () => {
        const dataSetToSave = createDataSet({
            name: "Test DataSet",
            indicators: [],
            project: undefined,
        }).updateProject(projectTest, configTest);

        const result = dataSetToSave.validateRegionCodes();
        expect(result).toHaveLength(0);

        expectUserGroups(dataSetToSave);
    });

    it("should report derived origin when project user groups match a region", async () => {
        const dataSet = createDataSet({}).updateProject(projectTest, configTest);

        expect(dataSet.getAccessOrigin(configTest)).toBe("derived");
    });

    it("should fallback to the project user groups when region derivation is empty", async () => {
        const dataSet = createDataSet({}).updateProject(projectWithoutRegionTest, configTest);

        expect(dataSet.access).toEqual(swAccessGroups);
        expect(dataSet.getAccessOrigin(configTest)).toBe("projectFallback");
    });

    it("should not copy project users on fallback, only user groups", async () => {
        const dataSet = createDataSet({}).updateProject(projectWithoutRegionTest, configTest);

        expect(dataSet.access.every(access => access.type === "groups")).toBe(true);
    });

    it("should have empty access when project has no user groups in its sharing", async () => {
        const dataSet = createDataSet({}).updateProject(projectWithoutGroupsTest, configTest);

        expect(dataSet.access).toEqual([]);
        expect(dataSet.getAccessOrigin(configTest)).toBe("none");
    });

    it("should keep fallback groups when updating access from region codes", async () => {
        const dataSet = createDataSet({}).updateProject(projectWithoutRegionTest, configTest);

        const updatedDataSet = dataSet.updateAccessFromRegionsCodes(["AF"], configTest);

        const fallbackGroups = updatedDataSet.access.filter(access =>
            access.name.startsWith("SW_")
        );
        expect(fallbackGroups).toEqual(swAccessGroups);
        expectUserGroups(updatedDataSet);
    });

    it("should replace region groups when updating access from region codes", async () => {
        const dataSet = createDataSet({}).updateProject(projectTest, configTest);

        const updatedDataSet = dataSet.updateAccessFromRegionsCodes([], configTest);

        expect(updatedDataSet.access).toEqual([]);
    });
});

function createDataSet(data?: Partial<DataSetAttrs>): DataSet {
    return DataSet.initial(getUid(new Date().getTime().toString()), data);
}

function createProject(code: string, access: AccessData[]): Project {
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

function expectUserGroups(dataSet: Maybe<DataSet>) {
    const adminUserGroupCode = "AF_Administrators";
    const userUserGroupCode = "AF_Users";

    const getUserGroupByName = (name: string) =>
        dataSet?.access.find(access => access.name === name);

    const adminGroup = getUserGroupByName(adminUserGroupCode);
    const userGroup = getUserGroupByName(userUserGroupCode);

    expect(adminGroup?.name).toBe(adminUserGroupCode);
    expect(userGroup?.name).toBe(userUserGroupCode);
}
