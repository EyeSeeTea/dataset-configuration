import { D2Api } from "$/types/d2-api";
import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsDataRepository } from "$/domain/repositories/AppSettingsDataRepository";
import { apiToFuture } from "$/data/api-futures";

export class AppSettingsDataD2Repository implements AppSettingsDataRepository {
    constructor(private api: D2Api) {}
    get(): FutureData<AppSettingsData> {
        const metadataFields = { id: true, displayName: true, code: true };
        return apiToFuture(
            this.api.metadata.get({
                attributes: { fields: metadataFields },
                organisationUnitLevels: { fields: metadataFields },
                indicatorGroupSets: { fields: metadataFields },
                indicatorGroups: { fields: metadataFields },
                dataElementGroups: { fields: metadataFields },
                dataElementGroupSets: { fields: metadataFields },
                categoryCombos: { fields: metadataFields },
                categories: { fields: metadataFields },
                userGroups: { fields: metadataFields },
            })
        ).map(d2Response => {
            return {
                fields: d2Response.attributes.map(this.buildEntity),
                countriesLevel: d2Response.organisationUnitLevels.map(this.buildEntity),
                indicatorsGroups: d2Response.indicatorGroups.map(this.buildEntity),
                indicatorsGroupSets: d2Response.indicatorGroupSets.map(this.buildEntity),
                dataElementsGroups: d2Response.dataElementGroups.map(this.buildEntity),
                dataElementsGroupSets: d2Response.dataElementGroupSets.map(this.buildEntity),
                combinations: d2Response.categoryCombos.map(this.buildEntity),
                categories: d2Response.categories.map(this.buildEntity),
                userGroups: d2Response.userGroups.map(this.buildEntity),
            };
        });
    }

    private buildEntity(item: { displayName: string; id: string; code: string }) {
        return { text: item.displayName, value: item.id, code: item.code };
    }
}
