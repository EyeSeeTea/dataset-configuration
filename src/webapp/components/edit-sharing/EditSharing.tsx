import React from "react";
import {
    ConfirmationDialog,
    SearchResult,
    ShareUpdate,
    Sharing as SharingModal,
    SharingRule,
    useLoading,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";
import { Id } from "$/domain/entities/Ref";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { AccessType, DataSet } from "$/domain/entities/DataSet";
import { Maybe } from "$/utils/ts-utils";
import { useGetDataSetsByIds } from "$/webapp/hooks/useDataSets";

export type EditSharingProps = { dataSetIds: Id[]; onCancel: () => void };

const sharingOptions = {
    dataSharing: true,
    publicSharing: true,
    externalSharing: true,
    permissionPicker: true,
};

export const EditSharing = React.memo((props: EditSharingProps) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();
    const { dataSetIds, onCancel } = props;
    const [sharingValue, setSharingValue] = React.useState<ShareUpdate>();
    const { dataSets, setDataSets } = useGetDataSetsByIds(dataSetIds);

    const multipleDataSets = dataSetIds.length > 1;

    const dataSet = _(dataSets || []).first();
    const joinDataSetsShortNames = dataSets?.map(ds => ds.shortName).join(", ");

    const saveDataSets = React.useCallback(
        async (shareUpdate: ShareUpdate) => {
            if (!dataSets) return Promise.resolve();
            loading.show(true, i18n.t("Saving sharing settings..."));
            return compositionRoot.dataSets.save
                .execute({ dataSets: dataSets, shareUpdate: shareUpdate })
                .toPromise()
                .then(dataSets => {
                    setSharingValue(shareUpdate);
                    setDataSets(dataSets);
                    snackbar.success(i18n.t("Sharing settings saved"));
                    loading.hide();
                })
                .catch(error => {
                    snackbar.error(error.message);
                    loading.hide();
                });
        },
        [compositionRoot.dataSets.save, dataSets, loading, snackbar, setDataSets, setSharingValue]
    );

    const searchSharing = React.useCallback(
        async (value: string) => {
            return compositionRoot.sharing.search
                .execute(value)
                .toPromise()
                .then((response): SearchResult => {
                    return {
                        userGroups: response.userGroupAccesses.map(group => {
                            return { displayName: group.name, id: group.id };
                        }),
                        users: response.userAccesses.map(user => {
                            return { displayName: user.name, id: user.id };
                        }),
                    };
                });
        },
        [compositionRoot.sharing.search]
    );

    const sharingMetaValue = {
        object: {
            id: dataSet?.id || "",
            displayName: multipleDataSets
                ? `[${dataSetIds.length}] ${joinDataSetsShortNames}`
                : dataSet?.name,
            externalAccess: false,
            publicAccess:
                dataSet && !sharingValue?.publicAccess
                    ? DataSet.generateFullPermission(dataSet)
                    : sharingValue?.publicAccess,
            userAccesses: buildAccessByType(multipleDataSets, dataSet, "users", sharingValue),
            userGroupAccesses: buildAccessByType(multipleDataSets, dataSet, "groups", sharingValue),
        },
        meta: { allowExternalAccess: false, allowPublicAccess: true },
    };

    return (
        <ConfirmationDialog
            cancelText={i18n.t("Close")}
            fullWidth
            onCancel={onCancel}
            open
            title={i18n.t("Sharing Settings")}
        >
            <SharingModal
                meta={sharingMetaValue}
                onChange={saveDataSets}
                onSearch={searchSharing}
                showOptions={sharingOptions}
            />
        </ConfirmationDialog>
    );
});

function buildAccessByType(
    multipleDataSets: boolean,
    dataSet: Maybe<DataSet>,
    type: AccessType,
    sharingValue: Maybe<ShareUpdate>
): Maybe<SharingRule[]> {
    const selectedValues =
        type === "users" ? sharingValue?.userAccesses : sharingValue?.userGroupAccesses;

    const dataSetAccess = _(dataSet?.access || [])
        .filter(access => access.type === type)
        .map((access): SharingRule => {
            return { access: access.value, displayName: access.name, id: access.id };
        })
        .value();

    return multipleDataSets
        ? selectedValues
        : _([...dataSetAccess, ...(selectedValues || [])])
              .uniqBy(access => access.id)
              .value();
}

EditSharing.displayName = "EditSharing";
