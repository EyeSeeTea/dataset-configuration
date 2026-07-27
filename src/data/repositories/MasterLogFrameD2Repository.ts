import { D2Api, D2ApiMetadataType } from "$/types/d2-api";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { MasterLogFrameRepository } from "$/domain/repositories/MasterLogFrameRepository";
import { apiToFuture } from "$/data/api-futures";
import { Id } from "$/domain/entities/Ref";
import _ from "$/domain/entities/generic/Collection";
import { chunkRequest } from "$/data/utils";
import { extractRegionCode } from "$/domain/entities/Region";

export class MasterLogFrameD2Repository implements MasterLogFrameRepository {
    private MLF_CODE = "MLF";

    constructor(private api: D2Api) {}

    getByCode(codes: string[]): FutureData<MasterLogFrame[]> {
        if (codes.length === 0) return Future.success([]);

        return this.getMlfGroupSets(codes).flatMap(({ deGroupSetIds, indicatorGroupSetIds }) => {
            return Future.joinObj({
                dataElementGroups: this.getDataElementGroups(deGroupSetIds),
                indicatorGroups: this.getIndicatorGroups(indicatorGroupSetIds),
            }).map(({ dataElementGroups, indicatorGroups }) => {
                return dataElementGroups.concat(indicatorGroups);
            });
        });
    }

    private getMlfGroupSets(
        codes: string[]
    ): FutureData<{ deGroupSetIds: Id[]; indicatorGroupSetIds: Id[] }> {
        return Future.joinObj({
            dataElementGroupSet: this.getDataElementGroupSet(codes),
            indicatorGroupSet: this.getIndicatorGroupSet(codes),
        }).map(({ dataElementGroupSet, indicatorGroupSet }) => {
            return { deGroupSetIds: dataElementGroupSet, indicatorGroupSetIds: indicatorGroupSet };
        });
    }

    private getDataElementGroups(groupIds: Id[]): FutureData<MasterLogFrame[]> {
        return chunkRequest(groupIds, ids => {
            return apiToFuture(
                this.api.models.dataElementGroups.get({
                    fields: dataElementGroupFields,
                    filter: { id: { in: ids } },
                })
            ).map(response => {
                return response.objects.map(d2Group =>
                    this.buildMasterLogFrame({ ...d2Group, type: "dataElementGroup" })
                );
            });
        });
    }

    private getIndicatorGroups(groupSetIds: Id[]): FutureData<MasterLogFrame[]> {
        return chunkRequest(groupSetIds, ids => {
            return apiToFuture(
                this.api.models.indicatorGroups.get({
                    fields: indicatorGroupFields,
                    filter: { id: { in: ids } },
                })
            ).map(response =>
                response.objects.map(d2Group =>
                    this.buildMasterLogFrame({ ...d2Group, type: "indicatorGroup" })
                )
            );
        });
    }

    private buildMasterLogFrame(d2Group: D2Group): MasterLogFrame {
        switch (d2Group.type) {
            case "dataElementGroup":
                return {
                    id: d2Group.id,
                    name: d2Group.displayDescription || d2Group.displayName,
                    type: "outputs",
                    indicators: _(d2Group.dataElements)
                        .map(dataElement => ({ id: dataElement.id }))
                        .sortBy(dataElement => dataElement.id)
                        .value(),
                };

            case "indicatorGroup":
                return {
                    id: d2Group.id,
                    name: d2Group.description || d2Group.displayName,
                    type: "outcomes",
                    indicators: _(d2Group.indicators)
                        .map(indicator => ({ id: indicator.id }))
                        .sortBy(indicator => indicator.id)
                        .value(),
                };
        }
    }

    private getDataElementGroupSet(codes: string[]): FutureData<Id[]> {
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: { dataElementGroups: { id: true, code: true, name: true } },
                paging: false,
                filter: { code: { eq: this.MLF_CODE } },
            })
        ).map(response => {
            const d2GroupSet = response.objects[0];
            return d2GroupSet
                ? this.filterByCodeAndExtractIds(codes, d2GroupSet.dataElementGroups)
                : [];
        });
    }

    private getIndicatorGroupSet(codes: string[]): FutureData<Id[]> {
        return apiToFuture(
            this.api.models.indicatorGroupSets.get({
                fields: { id: true, indicatorGroups: { id: true, code: true, name: true } },
                paging: false,
                filter: { code: { eq: this.MLF_CODE } },
            })
        ).map(response => {
            const d2GroupSet = response.objects[0];
            return d2GroupSet
                ? this.filterByCodeAndExtractIds(codes, d2GroupSet.indicatorGroups)
                : [];
        });
    }

    private filterByCodeAndExtractIds(
        codes: string[],
        groups: Array<{ id: Id; code: string; name: string }>
    ): Id[] {
        return groups
            .filter(group => codes.includes(extractRegionCode(group.code ?? group.name)))
            .map(group => group.id);
    }
}

const dataElementGroupFields = {
    id: true,
    displayName: true,
    code: true,
    dataElements: true,
    displayDescription: true,
} as const;

const indicatorGroupFields = {
    id: true,
    displayName: true,
    code: true,
    indicators: true,
    description: true,
} as const;

type D2DataElementGroup = D2ApiMetadataType<"dataElementGroups", typeof dataElementGroupFields>;
type D2IndicatorGroup = D2ApiMetadataType<"indicatorGroups", typeof indicatorGroupFields>;

type D2DataElementGroupDiscriminated = D2DataElementGroup & {
    type: "dataElementGroup";
};

type D2IndicatorGroupDiscriminated = D2IndicatorGroup & {
    type: "indicatorGroup";
};

type D2Group = D2DataElementGroupDiscriminated | D2IndicatorGroupDiscriminated;
