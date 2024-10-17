export type Id = string;
export type ISODateString = string;
export type OctalNotationPermission = string;

export interface Ref {
    id: Id;
}

export interface NamedRef extends Ref {
    name: string;
}
