import { FutureData } from "$/domain/entities/generic/Future";
import { ISODateString, Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import _ from "$/domain/entities/generic/Collection";
import { MetadataResponse } from "@eyeseetea/d2-api/api";
import { CancelableResponse } from "@eyeseetea/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { Category, defaultLabel } from "$/domain/entities/Category";
import { Maybe } from "$/utils/ts-utils";
import { Stats } from "$/domain/entities/Stats";

export function chunkRequest<Res>(
    ids: Id[],
    mapper: (ids: Id[]) => FutureData<Res[]>,
    options: { chunkSize: number } = { chunkSize: 50 }
): FutureData<Res[]> {
    return Future.flatten(
        _(ids)
            .chunk(options.chunkSize)
            .map(idsC => {
                return mapper(idsC);
            })
            .value()
    );
}

export function getErrorFromResponse(res: MetadataResponse): string {
    const errorsMessages = res.typeReports
        .flatMap(typeReport => typeReport.objectReports)
        .flatMap(objectReport => objectReport.errorReports)
        .flatMap(errorReport => errorReport.message);

    return _(errorsMessages)
        .filter(error => error.length > 0)
        .join("\n");
}

export function runMetadata(d2Response: CancelableResponse<MetadataResponse>): FutureData<void> {
    return apiToFuture(d2Response).flatMap(res =>
        res.status !== "OK"
            ? Future.error(new Error(getErrorFromResponse(res)))
            : Future.success(undefined)
    );
}

export function buildErrorFromException(err: Error): string {
    const error = err as unknown as MapError;
    const errorResponse = error?.response?.data?.response;
    if (!errorResponse) return error.message ?? "Unknown error";

    return getErrorFromResponse(errorResponse);
}

export function convertToCategories(d2Categories: D2Category[]): Category[] {
    return d2Categories.map(category => ({
        id: category.id,
        name: category.name === defaultLabel ? category.name : category.displayName,
        options: category.categoryOptions.map(option => ({
            id: option.id,
            name: option.displayName,
        })),
    }));
}

export function convertAttributeValueToDate(
    dateString: Maybe<D2AttributeDateValue>
): ISODateString {
    if (!dateString) return "";

    if (!/^\d{8}$/.test(dateString)) {
        console.warn("invalid format, expected 8 digits", dateString);
        return "";
    }

    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));

    const date = new Date(year, month, day, 0, 0, 0);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        console.warn("Invalid date format. Expected YYYYMMDD");
        return "";
    }

    return date.toISOString();
}

export function getStatsFromD2Response(d2Response: MetadataResponse): Stats {
    const errorMessage = getErrorFromResponse(d2Response);
    return Stats.create({
        created: d2Response.stats.created,
        updated: d2Response.stats.updated,
        deleted: d2Response.stats.deleted,
        ignored: d2Response.stats.ignored,
        total: d2Response.stats.total,
        errorMessage: errorMessage,
    });
}

export type D2NamedRef = { id: Id; displayName: string };
export type D2Category = D2NamedRef & { name: string; categoryOptions: D2NamedRef[] };
export type D2CategoryCombo = D2NamedRef & {
    categories: D2Category[];
    categoryOptionCombos: D2NamedRef[];
};
type D2AttributeDateValue = string; // format: YYYYMMDD

type MapError = { response: Maybe<MapErroResponse>; message: string };
type MapErroResponse = { data: Maybe<ErrorResponse> };
type ErrorResponse = { response: MetadataResponse };
