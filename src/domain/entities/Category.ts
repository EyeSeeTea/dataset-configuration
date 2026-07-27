import { Id, NamedRef } from "$/domain/entities/Ref";

export const defaultLabel = "default";

export type Category = { id: Id; name: string; options: NamedRef[] };
