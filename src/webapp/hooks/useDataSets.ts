import React from "react";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";

import { DataSet } from "$/domain/entities/DataSet";
import { Id } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useNavigateTo } from "$/webapp/routes";
import { DatePeriod } from "$/domain/entities/DatePeriod";
import { useCallbackEffect } from "$/webapp/hooks/useCallbackEffect";

export function useGetDataSetsByIds(ids: Id[]) {
    const { compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();
    const [dataSets, setDataSets] = React.useState<DataSet[]>();

    const getDataSets = useCallbackEffect(
        React.useCallback(() => {
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
        }, [compositionRoot.dataSets.getByIds, ids, loading, snackbar])
    );

    React.useEffect(() => getDataSets(), [getDataSets]);

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

export function useDeleteDataSets(props: DataSetIdsAndCallback) {
    const { ids, onError, onSuccess } = props;
    const { compositionRoot } = useAppContext();
    const loading = useLoading();

    const deleteDataSets = React.useCallback(() => {
        if (!ids.length) return;

        loading.show(true, i18n.t("Removing DataSets"));
        return compositionRoot.dataSets.remove.execute(ids).run(
            () => {
                loading.hide();
                onSuccess();
            },
            err => {
                loading.hide();
                onError(err.message);
            }
        );
    }, [compositionRoot.dataSets.remove, ids, onError, onSuccess, loading]);

    return { deleteDataSets };
}

export function useUpdatePeriodDate(props: DataSetIdsAndCallback) {
    const { ids, onError, onSuccess } = props;
    const { compositionRoot } = useAppContext();
    const loading = useLoading();

    const updatePeriodDate = React.useCallback(
        (periodDate: DatePeriod) => {
            if (!ids.length) return;

            loading.show(true, i18n.t("Updating period date"));
            return compositionRoot.dataSets.savePeriodDate
                .execute({ dataSetsIds: ids, periodDate })
                .run(
                    () => {
                        loading.hide();
                        onSuccess();
                    },
                    err => {
                        loading.hide();
                        onError(err.message);
                    }
                );
        },
        [compositionRoot.dataSets.savePeriodDate, ids, onError, onSuccess, loading]
    );

    return { updatePeriodDate };
}

export function useDataSetsRoutes() {
    const navigateTo = useNavigateTo();

    const goToCreateDataSet = React.useCallback(() => {
        navigateTo("createDataSets");
    }, [navigateTo]);

    return { goToCreateDataSet };
}

type CallbackMethodsType = { onError: (message: string) => void; onSuccess: () => void };
type DataSetIdsAndCallback = { ids: Id[] } & CallbackMethodsType;
