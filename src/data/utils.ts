import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import _ from "$/domain/entities/generic/Collection";
import { MetadataResponse } from "@eyeseetea/d2-api/api";
import { CancelableResponse } from "@eyeseetea/d2-api";
import { apiToFuture } from "$/data/api-futures";
import { Category } from "$/domain/entities/Category";

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
    console.debug(JSON.stringify(res, null, 4));

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

export function convertToCategories(d2Categories: D2Category[]): Category[] {
    return d2Categories.map(category => ({
        id: category.id,
        name: category.displayName,
        options: category.categoryOptions.map(option => ({
            id: option.id,
            name: option.displayName,
        })),
    }));
}

export type D2NamedRef = { id: Id; displayName: string };
export type D2Category = D2NamedRef & { categoryOptions: D2NamedRef[] };
export type D2CategoryCombo = D2NamedRef & { categories: D2Category[] };
