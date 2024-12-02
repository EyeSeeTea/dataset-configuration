import { D2Api } from "$/types/d2-api";
import { CoreCompetency } from "$/domain/entities/DataSet";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { apiToFuture } from "$/data/api-futures";
import { D2ApiConfig, D2Config } from "$/data/repositories/D2ApiConfig";
import i18n from "$/utils/i18n";

export class CoreCompetencyD2Repository implements CoreCompetencyRepository {
    private d2ApiConfig: D2ApiConfig;

    constructor(private api: D2Api) {
        this.d2ApiConfig = new D2ApiConfig(api);
    }

    getAll(): FutureData<CoreCompetency[]> {
        return this.getConfig().flatMap(config => {
            const coreCompetencyId = config.dataElementGroupSets.coreCompetency.id;
            return apiToFuture(
                this.api.models.dataElementGroupSets.get({
                    fields: {
                        id: true,
                        displayName: true,
                        dataElementGroups: { id: true, code: true, displayName: true },
                    },
                    filter: { id: { eq: coreCompetencyId } },
                })
            ).flatMap(d2Response => {
                const coreCompetencyGroup = d2Response.objects[0];
                return coreCompetencyGroup
                    ? Future.success(
                          coreCompetencyGroup.dataElementGroups.map(
                              (d2DataElementGroup): CoreCompetency => ({
                                  id: d2DataElementGroup.id,
                                  code: d2DataElementGroup.code,
                                  name: d2DataElementGroup.displayName,
                              })
                          )
                      )
                    : Future.error(
                          new Error(i18n.t(`Core competency group not found: ${coreCompetencyId}`))
                      );
            });
        });
    }

    private getConfig(): FutureData<D2Config> {
        return this.d2ApiConfig.get();
    }
}
