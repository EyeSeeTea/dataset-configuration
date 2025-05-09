export type Id = string;
export type ISODateString = string;

export interface Ref {
    id: Id;
}

export interface NamedRef extends Ref {
    name: string;
}

export interface NamedCodeRef extends NamedRef {
    code: Code;
}

export function getRef<Obj extends Ref>(obj: Obj): Ref {
    return { id: obj.id };
}

export function getRefs<Obj extends Ref>(objs: Obj[]): Ref[] {
    return objs.map(getRef);
}

export type Code = string;
