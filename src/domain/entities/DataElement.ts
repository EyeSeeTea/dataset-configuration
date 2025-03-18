import { Category } from "$/domain/entities/Category";
import { Id, NamedRef } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";

export type Disaggregation = NamedRef & { categories: Category[] };

export type DataElement = {
    id: Id;
    name: string;
    code: string;
    disaggregation: Maybe<Disaggregation>;
    categories: Category[];
    isComment: boolean;
};

export const COMMENT_SUFIX = "-C";
