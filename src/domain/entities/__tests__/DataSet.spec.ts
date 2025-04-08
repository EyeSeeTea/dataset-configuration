import { DataSet, DataSetAttrs } from "$/domain/entities/DataSet";
import { Permission } from "$/domain/entities/Permission";
import { Project } from "$/domain/entities/Project";
import { getErrorMessageFromErrors } from "$/domain/entities/generic/Error";
import { configTest } from "$/utils/tests";
import { Maybe } from "$/utils/ts-utils";
import { getUid } from "$/utils/uid";

const projectTest: Project = Project.create({
    id: getUid(new Date().getTime().toString()),
    name: "Test Project Afghanistan",
    isOpen: true,
    code: "AFFE1507",
    lastUpdated: new Date().toISOString(),
    orgsUnits: [],
    dataSets: [],
    access: [
        {
            id: "",
            name: "AF_Administrators",
            type: "groups",
            permissions: Permission.initialPermissions(),
        },
        {
            id: "",
            name: "AF_Users",
            type: "groups",
            permissions: Permission.initialPermissions(),
        },
    ],
});

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
});

function createDataSet(data?: Partial<DataSetAttrs>): DataSet {
    return DataSet.initial(getUid(new Date().getTime().toString()), data);
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
