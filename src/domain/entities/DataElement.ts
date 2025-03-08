import { Category } from "$/domain/entities/Category";
import { DisaggregationAttrs } from "$/domain/entities/Indicator";
import { Id } from "$/domain/entities/Ref";
import { Maybe } from "$/utils/ts-utils";

export type DataElement = {
    id: Id;
    name: string;
    code: string;
    description: string;
    disaggregation: Maybe<DisaggregationAttrs>;
    categories: Category[];
    isComment: boolean;
    valueType: string;
};

export const COMMENT_SUFIX = "-C";
