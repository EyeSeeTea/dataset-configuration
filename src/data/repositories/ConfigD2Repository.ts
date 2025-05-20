import { D2ApiIndicator } from "$/data/D2ApiIndicator";
import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import { convertToCategories } from "$/data/utils";
import { CategoryCombination } from "$/domain/entities/CategoryCombination";
import { Config } from "$/domain/entities/Config";
import { Region, extractRegionCode } from "$/domain/entities/Region";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { ConfigRepository } from "$/domain/repositories/ConfigRepository";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { UserGroup } from "$/domain/entities/UserGroup";
import { DEFAULT_UNIT_DATE } from "$/domain/entities/UnitDate";

export class ConfigD2Repository implements ConfigRepository {
    private d2ApiConfig: D2ApiConfig;
    private d2ApiIndicator: D2ApiIndicator;
    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(this.api);
        this.d2ApiIndicator = new D2ApiIndicator(this.api);
    }

    get(): FutureData<Config> {
        return this.getConfig().flatMap(apiConfig => {
            return Future.joinObj(
                {
                    regions: this.getRegions(apiConfig.organisationUnitLevels.country.level),
                    userGroups: this.getUserGroups(),
                    indicators: this.getIndicators(),
                    categoryCombinations: this.getCategoryCombos([], 1),
                },
                { concurrency: 4 }
            ).map(response => {
                return {
                    ...response,
                    periodEndDateMonth: apiConfig.periodEndDateMonth,
                    periodEndDateDay: apiConfig.periodEndDateDay,
                    periodLastYearEndDate: apiConfig.periodLastYearEndDate,
                    notificationUserGroup: apiConfig.userGroups.adminNotification,
                    periodLastYearUnits: apiConfig.periodLastYearUnits || DEFAULT_UNIT_DATE,
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
            return Future.joinObj(
                {
                    outcomeIndicators: this.d2ApiIndicator.getOutcomeIndicators(config),
                    outputIndicators: this.d2ApiIndicator.getOutputIndicators(config),
                },
                { concurrency: 2 }
            ).map(({ outcomeIndicators, outputIndicators }) => {
                return outcomeIndicators.concat(outputIndicators);
            });
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
            return _(d2Response.objects)
                .compactMap(region => {
                    const regionCode = extractRegionCode(region.code);
                    if (!regionCode) {
                        console.warn(
                            `Region ${region.name} (${region.id}) does not have a valid region code`
                        );
                        return undefined;
                    }
                    return { ...region, code: regionCode };
                })
                .value();
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
