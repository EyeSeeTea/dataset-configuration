import { Struct } from "$/domain/entities/generic/Struct";

type StatsAttrs = {
    created: number;
    updated: number;
    deleted: number;
    ignored: number;
    total: number;
    errorMessage: string;
};

export class Stats extends Struct<StatsAttrs>() {
    static combine(stats: Stats[]): Stats {
        return stats.reduce((acum, stat): Stats => {
            return Stats.create({
                errorMessage: `${acum.errorMessage}${stat.errorMessage}`,
                created: acum.created + stat.created,
                ignored: acum.ignored + stat.ignored,
                updated: acum.updated + stat.updated,
                total: acum.total + stat.total,
                deleted: acum.deleted + stat.deleted,
            });
        }, Stats.empty());
    }

    static empty(): Stats {
        return Stats.create({
            errorMessage: "",
            created: 0,
            ignored: 0,
            updated: 0,
            total: 0,
            deleted: 0,
        });
    }
}
