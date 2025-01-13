export type Id = string;
export type ISODateString = string;

export interface Ref {
    id: Id;
}

export interface NamedRef extends Ref {
    name: string;
}

export interface NamedCodeRef extends NamedRef {
    code: string;
}
