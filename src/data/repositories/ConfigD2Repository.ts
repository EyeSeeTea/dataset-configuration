import { D2ApiIndicator } from "$/data/D2ApiIndicator";
import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config, metadataCodes } from "$/data/repositories/D2ApiMetadata";
import { convertToCategories } from "$/data/utils";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Config } from "$/domain/entities/Config";
import { Project } from "$/domain/entities/Project";
import { Region, extractRegionCode } from "$/domain/entities/Region";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { ConfigRepository } from "$/domain/repositories/ConfigRepository";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { UserGroup } from "$/domain/entities/UserGroup";

export class ConfigD2Repository implements ConfigRepository {
    private d2ApiConfig: D2ApiConfig;
    private d2ApiIndicator: D2ApiIndicator;
    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(this.api);
        this.d2ApiIndicator = new D2ApiIndicator(this.api);
    }

    get(): FutureData<Config> {
        return this.getConfig().flatMap(apiConfig => {
            return Future.joinObj({
                regions: this.getRegions(apiConfig.organisationUnitLevels.country.level),
                userGroups: this.getUserGroups(),
                indicators: this.getIndicators(),
                categoryCombinations: this.getCategoryCombos([], 1),
            }).map(response => {
                return {
                    ...response,
                    periodEndDateMonth: apiConfig.periodEndDateMonth,
                    periodEndDateDay: apiConfig.periodEndDateDay,
                    periodLastYearEndDate: apiConfig.periodLastYearEndDate,
                    periodLastYearUnits: apiConfig.periodLastYearUnits,
                    notificationUserGroup: apiConfig.userGroups.adminNotification,
                };
            });
        });
    }

    private getCategoryCombos(
        state: CategoryCombination[],
        page: number
    ): FutureData<CategoryCombination[]> {
        return apiToFuture(
            this.api.models.categoryCombos.get({
                fields: {
                    id: true,
                    displayName: true,
                    categories: {
                        id: true,
                        name: true,
                        displayName: true,
                        categoryOptions: { id: true, displayName: true },
                    },
                },
                filter: {
                    dataDimensionType: { eq: "DISAGGREGATION" },
                },
                pageSize: 200,
                page: page,
            })
        ).flatMap(d2Response => {
            const combinations = d2Response.objects.map((d2CategoryCombo): CategoryCombination => {
                return CategoryCombination.create({
                    id: d2CategoryCombo.id,
                    name: d2CategoryCombo.displayName,
                    categories: convertToCategories(d2CategoryCombo.categories),
                    optionsCombos: [],
                });
            });
            if (d2Response.pager.page < d2Response.pager.pageCount) {
                return this.getCategoryCombos(
                    state.concat(combinations),
                    d2Response.pager.page + 1
                );
            } else {
                return Future.success(state.concat(combinations));
            }
        });
    }

    private getConfig(): FutureData<D2Config> {
        return this.d2ApiConfig.get();
    }

    private getIndicators() {
        return this.getConfig().flatMap(config => {
            return Future.joinObj({
                outcomeIndicators: this.d2ApiIndicator.getOutcomeIndicators(config),
                outputIndicators: this.d2ApiIndicator.getOutputIndicators(config),
            }).map(({ outcomeIndicators, outputIndicators }) => {
                return outcomeIndicators.concat(outputIndicators);
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
            this.api.models.userGroups.get({ fields: { id: true, name: true }, paging: false })
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
