import { NamedRef } from "$/domain/entities/Ref";

export type NamedCodeRef = NamedRef & { code: string };

export type MetadataItem = {
    attributes: { project: NamedCodeRef; createdByApp: NamedCodeRef };
    categories: { project: NamedCodeRef };
};
