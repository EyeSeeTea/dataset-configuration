import { AccessData, DataSet, OrgUnit } from "$/domain/entities/DataSet";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";
import _ from "$/domain/entities/generic/Collection";
import { User } from "$/domain/entities/User";

export type ProjectAttrs = {
    id: Id;
    code: Maybe<string>;
    name: string;
    isOpen: boolean;
    dataSets: DataSet[];
    lastUpdated: ISODateString;
    orgsUnits: OrgUnit[];
    access: AccessData[];
};

export class Project extends Struct<ProjectAttrs>() {
    get uniqueAccessCodes(): string[] {
        return _(this.access)
            .filter(access => access.type === "groups")
            .compactMap(access => Project.extractCode(access.name))
            .uniq()
            .value();
    }

    static build(data: ProjectAttrs): Project {
        if (!data.id) {
            throw new Error(i18n.t("Project id is required"));
        }

        if (!data.name) {
            throw new Error(i18n.t("Project name is required"));
        }

        return Project.create(data);
    }

    static setDataSets(project: ProjectAttrs, dataSets: DataSet[]): Project {
        return Project.build({ ...project, dataSets });
    }

    setOrgUnits(orgsUnits: OrgUnit[]): Project {
        return this._update({ orgsUnits });
    }

    /**
     * Extracts the portion of a code string before the first underscore ("_")
     * and converts it to uppercase.
     *
     * Example:
     * Input: "us_region"
     * Output: "US"
     *
     */
    static extractCode(value: string): Maybe<string> {
        return (value.split("_")[0] || "").toUpperCase();
    }

    canEdit(user: User): boolean {
        return user.userGroups.some(userGroup =>
            this.access.some(access =>
                access.type === "groups" &&
                access.permissions.metadata.write &&
                access.id === userGroup.id
            )
        );
    }
}
