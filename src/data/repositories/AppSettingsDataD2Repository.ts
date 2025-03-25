import { D2Api } from "$/types/d2-api";
import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsDataRepository } from "$/domain/repositories/AppSettingsDataRepository";
import { apiToFuture } from "$/data/api-futures";
import { D2NamedRef } from "$/data/utils";

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
            const buildEntities = (entities: D2GenericEntity[]) =>
                entities.map(entity => this.buildEntity(entity));

            return {
                fields: buildEntities(d2Response.attributes),
                countriesLevel: buildEntities(d2Response.organisationUnitLevels),
                indicatorsGroups: buildEntities(d2Response.indicatorGroups),
                indicatorsGroupSets: buildEntities(d2Response.indicatorGroupSets),
                dataElementsGroups: buildEntities(d2Response.dataElementGroups),
                dataElementsGroupSets: buildEntities(d2Response.dataElementGroupSets),
                combinations: buildEntities(d2Response.categoryCombos),
                categories: buildEntities(d2Response.categories),
                userGroups: buildEntities(d2Response.userGroups),
            };
        });
    }

    private buildEntity(item: D2GenericEntity) {
        return { text: item.displayName, value: item.id, code: item.code };
    }
}

type D2GenericEntity = D2NamedRef & { code: string };
