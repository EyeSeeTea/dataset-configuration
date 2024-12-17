import { D2Api } from "$/types/d2-api";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiMetadata";
import i18n from "$/utils/i18n";
import { Id } from "$/domain/entities/Ref";

export class CoreCompetencyD2Repository implements CoreCompetencyRepository {
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(api);
    }

    getAll(): FutureData<CoreCompetency[]> {
        return this.getConfig().flatMap(config => {
            const coreCompetencyId = config.dataElementGroupSets.coreCompetency.id;
            return this.getDataElementGroupSetById(coreCompetencyId).flatMap(d2GroupSet => {
                return this.mapToCoreCompetencies(d2GroupSet.dataElementGroups);
            });
        });
    }

    private getDataElementGroupSetById(id: Id): FutureData<D2DataElementGroupSet> {
        return apiToFuture(
            this.api.models.dataElementGroupSets.get({
                fields: {
                    id: true,
                    displayName: true,
                    dataElementGroups: { id: true, code: true, displayName: true },
                },
                filter: { id: { eq: id } },
            })
        ).flatMap(d2Response => {
            const d2DataElementGroupSet = d2Response.objects[0];
            return d2DataElementGroupSet
                ? Future.success(d2DataElementGroupSet)
                : Future.error(new Error(i18n.t(`dataElementGroupSet not found: ${id}`)));
        });
    }

    private mapToCoreCompetencies(
        dataElementGroups: D2DataElementGroup[]
    ): FutureData<CoreCompetency[]> {
        return Future.success(
            dataElementGroups.map(
                (d2DataElementGroup): CoreCompetency => ({
                    id: d2DataElementGroup.id,
                    code: d2DataElementGroup.code,
                    name: d2DataElementGroup.displayName,
                })
            )
        );
    }

    private getConfig(): FutureData<D2Config> {
        return this.d2ApiConfig.get();
    }
}

type D2DataElementGroupSet = { id: Id; dataElementGroups: D2DataElementGroup[] };
type D2DataElementGroup = { id: Id; displayName: string; code: string };
