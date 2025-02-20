import React from "react";
import { useParams } from "react-router";

import { DataSet } from "$/domain/entities/DataSet";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetWizard } from "$/webapp/components/dataset-wizard/DataSetWizard";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Project } from "$/domain/entities/Project";
import { generateUid } from "$/utils/uid";
import { component } from "$/utils/react";
import i18n from "$/utils/i18n";
import { DataSetSettings } from "$/domain/entities/DataSetSettings";

const RegisterDataSetPage_ = () => {
    const { id } = useParams<Partial<Ref>>();
    const { projects } = useGetProjects();
    const loading = useLoading();
    const { dataSet, status, updateDataSet, dataSetSettings } = useGetDataSetSettings({
        id: id || "",
    });

    React.useEffect(() => {
        if (status === "loading") {
            loading.show(true, i18n.t("Loading..."));
        } else {
            loading.hide();
        }
    }, [loading, status]);

    if (!dataSetSettings) return null;

    return (
        <DataSetWizard
            id={id}
            dataSet={dataSet}
            projects={projects}
            dataSetSettings={dataSetSettings}
            updateDataSet={updateDataSet}
        />
    );
};

export function useGetDataSetSettings(props: { id: Id }) {
    const { id } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [status, setStatus] = React.useState<LoadingStatus>("idle");
    const [dataSet, updateDataSet] = React.useState<DataSet>(DataSet.initial(generateUid()));
    const [dataSetSettings, setDataSetSettings] = React.useState<DataSetSettings>();

    React.useEffect(() => {
        setStatus("loading");
        return compositionRoot.dataSets.getSettings.execute({ dataSetId: id }).run(
            result => {
                setDataSetSettings(result);
                updateDataSet(result.dataSet);
                setStatus("finished");
            },
            error => {
                snackbar.error(error.message);
                setStatus("error");
            }
        );
    }, [compositionRoot.dataSets.getSettings, snackbar, id]);

    return {
        dataSet,
        dataSetSettings,
        status,
        updateDataSet,
    };
}

function useGetProjects() {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [projects, setProjects] = React.useState<Project[]>([]);

    React.useEffect(() => {
        return compositionRoot.projects.getAll.execute().run(setProjects, error => {
            snackbar.error(error.message);
        });
    }, [compositionRoot.projects.getAll, snackbar]);

    return { projects };
}

export type LoadingStatus = "idle" | "loading" | "finished" | "error";

export const RegisterDataSetPage = component(RegisterDataSetPage_);
