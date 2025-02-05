import { Id, NamedRef } from "$/domain/entities/Ref";

export type Category = { id: Id; name: string; options: NamedRef[] };
