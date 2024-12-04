import { DataSet, OrgUnit } from "$/domain/entities/DataSet";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Struct } from "$/domain/entities/generic/Struct";
import i18n from "$/utils/i18n";
import { Maybe } from "$/utils/ts-utils";

export type ProjectAttrs = {
    id: Id;
    code: Maybe<string>;
    name: string;
    isOpen: boolean;
    dataSets: DataSet[];
    lastUpdated: ISODateString;
    orgsUnits: OrgUnit[];
};

export class Project extends Struct<ProjectAttrs>() {
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
}
