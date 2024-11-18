import { FutureData } from "$/domain/entities/generic/Future";
import { Id } from "$/domain/entities/Ref";
import { Future } from "$/domain/entities/generic/Future";
import _ from "$/domain/entities/generic/Collection";

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
