import { apiToFuture } from "$/data/api-futures";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { Indicator } from "$/domain/entities/Indicator";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { D2Api } from "$/types/d2-api";
import _ from "$/domain/entities/generic/Collection";
import { Id, Ref } from "$/domain/entities/Ref";
import { Config } from "$/domain/entities/Config";

export class IndicatorD2Repository implements IndicatorRepository {
    constructor(private api: D2Api, private config: Config) {}

    get(): FutureData<Indicator[]> {
        return Future.success(this.config.indicators);
    }

    getByDataSetId(dataSetId: Id): FutureData<Indicator[]> {
        return Future.joinObj({
            dataSetSections: this.getDataSetSections(dataSetId),
            indicators: this.get(),
        }).map(({ dataSetSections, indicators }) => {
            if (dataSetSections.sections.length === 0) return indicators;

            const dataElementsInSection = dataSetSections.sections.flatMap(section =>
                section.dataElements.map(dataElement => dataElement.id)
            );

            const indicatorsInSection = dataSetSections.sections.flatMap(section =>
                section.indicators.map(indicator => indicator.id)
            );

            const allIds = dataElementsInSection.concat(indicatorsInSection);

            return indicators.filter(indicator => allIds.includes(indicator.id));
        });
    }

    private getDataSetSections(id: Id): FutureData<D2DataSetSection> {
        return apiToFuture(
            this.api.models.dataSets.get({
                fields: {
                    id: true,
                    sections: {
                        id: true,
                        name: true,
                        code: true,
                        dataElements: {
                            id: true,
                            displayName: true,
                            code: true,
                            categoryCombo: { id: true, displayName: true },
                        },
                        indicators: { id: true, displayName: true, code: true },
                    },
                },
                filter: { id: { eq: id } },
                paging: false,
            })
        ).flatMap(d2Response => {
            const d2DataSet = d2Response.objects[0];
            if (!d2DataSet) return Future.error(new Error("DataSet not found"));
            return Future.success({
                id: d2DataSet.id,
                sections: d2DataSet.sections.map(section => {
                    return {
                        id: section.id,
                        name: section.name,
                        code: section.code,
                        dataElements: section.dataElements,
                        indicators: section.indicators,
                    };
                }),
            });
        });
    }
}

type D2DataSetSection = {
    id: Id;
    sections: Array<{
        id: Id;
        name: string;
        code: string;
        dataElements: Ref[];
        indicators: Ref[];
    }>;
};
