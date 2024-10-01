import { DataSet } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import React from "react";

export function useGetDataSetsByIds(ids: Id[]) {
    const { compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const [dataSets, setDataSets] = React.useState<DataSet[]>();

    React.useEffect(() => {
        loading.show(true, "Loading data sets");

        return compositionRoot.dataSets.getByIds.execute(ids).run(
            dataSets => {
                setDataSets(dataSets);
                loading.hide();
            },
            error => {
                snackbar.error(error.message);
                loading.hide();
            }
        );
    }, [compositionRoot.dataSets.getByIds, ids, loading, snackbar]);

    return { dataSets, setDataSets };
}

export function useSaveOrgUnits() {
    const { compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();

    const saveOrgUnits = React.useCallback(
        (dataSetsIds: Id[], orgUnitsIds: Id[], action: "merge" | "replace") => {
            loading.show(true, "Saving organisation units");

            const ids = orgUnitsIds.map(path => {
                const parts = path.split("/");
                const lastPart = parts.at(-1);
                if (!lastPart) throw new Error(`Cannot get orgunit: ${lastPart}`);
                return lastPart;
            });

            return compositionRoot.dataSets.saveOrgUnits
                .execute({ action, dataSetsIds, orgUnitsIds: ids })
                .run(
                    () => {
                        snackbar.success("Organisation units saved");
                        loading.hide();
                    },
                    error => {
                        snackbar.error(error.message);
                        loading.hide();
                    }
                );
        },
        [compositionRoot.dataSets.saveOrgUnits, loading, snackbar]
    );

    return { saveOrgUnits };
}
