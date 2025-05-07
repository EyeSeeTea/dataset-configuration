import { D2Api, MetadataPick } from "$/types/d2-api";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";
import { MasterLogFrameRepository } from "$/domain/repositories/MasterLogFrameRepository";
import { apiToFuture } from "$/data/api-futures";
import { Id } from "$/domain/entities/Ref";
import { IndicatorType } from "$/domain/entities/Indicator";
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
                    this.buildMasterLogFrame(d2Group, "outputs")
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
                response.objects.map(d2Group => this.buildMasterLogFrame(d2Group, "outcomes"))
            );
        });
    }

    private buildMasterLogFrame(
        d2Group: D2DataElementGroup | D2IndicatorGroup,
        indicatorType: IndicatorType
    ): MasterLogFrame {
        const items =
            indicatorType === "outputs" && this.isDataElementGroup(d2Group)
                ? d2Group.dataElements
                : indicatorType === "outcomes" && this.isIndicatorGroup(d2Group)
                ? d2Group.indicators
                : [];

        const description = this.isDataElementGroup(d2Group)
            ? d2Group.displayDescription
            : d2Group.description;

        return {
            id: d2Group.id,
            name: description || d2Group.displayName,
            type: indicatorType,
            indicators: _(items)
                .map(d2DataElement => ({ id: d2DataElement.id }))
                .sortBy(indicator => indicator.id)
                .value(),
        };
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

    private isDataElementGroup(
        group: D2DataElementGroup | D2IndicatorGroup
    ): group is D2DataElementGroup {
        return "dataElements" in group;
    }

    private isIndicatorGroup(
        group: D2DataElementGroup | D2IndicatorGroup
    ): group is D2IndicatorGroup {
        return "indicators" in group;
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
};

type D2DataElementGroup = MetadataPick<{
    dataElementGroups: { fields: typeof dataElementGroupFields };
}>["dataElementGroups"][number];

type D2IndicatorGroup = MetadataPick<{
    indicatorGroups: { fields: typeof indicatorGroupFields };
}>["indicatorGroups"][number];
