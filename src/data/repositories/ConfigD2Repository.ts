import { apiToFuture } from "$/data/api-futures";
import { metadataCodes } from "$/data/repositories/D2ApiMetadata";
import { Config, UserGroup } from "$/domain/entities/Config";
import { Project } from "$/domain/entities/Project";
import { Region, extractRegionCode } from "$/domain/entities/Region";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { ConfigRepository } from "$/domain/repositories/ConfigRepository";
import { D2Api } from "$/types/d2-api";

export class ConfigD2Repository implements ConfigRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<Config> {
        return this.getOrgUnitLevelGroup().flatMap(orgUnitLevel => {
            return Future.joinObj({
                regions: this.getRegions(orgUnitLevel),
                userGroups: this.getUserGroups(),
            });
        });
    }

    private getOrgUnitLevelGroup(): FutureData<number> {
        return apiToFuture(
            this.api.models.organisationUnitLevels.get({
                fields: { id: true, level: true },
                filter: { name: { eq: metadataCodes.orgUnitLevels.country } },
            })
        ).flatMap(d2Response => {
            const orgUnitLevel = d2Response.objects[0];
            return orgUnitLevel
                ? Future.success(orgUnitLevel.level)
                : Future.error(new Error("Country level not found"));
        });
    }

    private getRegions(level: number): FutureData<Region[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                fields: { id: true, code: true, name: true },
                filter: { level: { eq: String(level) }, children: { gt: "0" } },
                paging: false,
            })
        ).map(d2Response => {
            return d2Response.objects.map(region => ({
                id: region.id,
                name: region.name,
                // org. unit code includes the region code in the first two letters before the underscore
                code: Project.extractCode(region.code),
            }));
        });
    }

    private getUserGroups(): FutureData<UserGroup[]> {
        return apiToFuture(
            this.api.models.userGroups.get({
                fields: { id: true, name: true },
                paging: false,
            })
        ).map(d2Response => {
            return d2Response.objects.map(d2UserGroup => ({
                id: d2UserGroup.id,
                name: d2UserGroup.name,
                // user group name includes the region code in the first two letters
                code: extractRegionCode(d2UserGroup.name),
            }));
        });
    }
}
