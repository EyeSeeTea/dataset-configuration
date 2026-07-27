import { Category } from "$/domain/entities/Category";
import { Disaggregation } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";

export type DataElement = {
    id: Id;
    name: string;
    code: string;
    description: string;
    initialDisaggregation: Maybe<Disaggregation>;
    disaggregation: Maybe<Disaggregation>;
    categories: Category[];
    isComment: boolean;
    valueType: string;
};

export const COMMENT_SUFIX = "-C";
