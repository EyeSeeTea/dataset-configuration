import { NamedCodeRef } from "$/domain/entities/Ref";
import { Region } from "$/domain/entities/Region";

export type UserGroup = NamedCodeRef;

export type Config = { regions: Region[]; userGroups: UserGroup[] };
