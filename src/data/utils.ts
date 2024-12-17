import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import _ from "$/domain/entities/generic/Collection";
import { MetadataResponse } from "@eyeseetea/d2-api/api";
import { CancelableResponse } from "@eyeseetea/d2-api";
import { apiToFuture } from "$/data/api-futures";

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
