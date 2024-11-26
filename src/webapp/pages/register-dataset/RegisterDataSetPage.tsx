import React from "react";
import { useParams } from "react-router";

import { DataSet } from "$/domain/entities/DataSet";
import { Permission } from "$/domain/entities/Permission";
import { Id, Ref } from "$/domain/entities/Ref";
import { DataSetWizard } from "$/webapp/components/dataset-wizard/DataSetWizard";
import { useAppContext } from "$/webapp/contexts/app-context";
import { useLoading, useSnackbar } from "@eyeseetea/d2-ui-components";
import { Project } from "$/domain/entities/Project";
import { getUid } from "$/utils/uid";
import { component } from "$/utils/react";
import { Maybe } from "$/utils/ts-utils";
import i18n from "$/utils/i18n";

const RegisterDataSetPage_ = () => {
    const { id } = useParams<Partial<Ref>>();
    const { dataSet, status, updateDataSet } = useGetDataSetById({ id });
    const { projects } = useGetProjects();
    const loading = useLoading();

    React.useEffect(() => {
        if (status === "loading") {
            loading.show(true, i18n.t("Loading..."));
        } else {
            loading.hide();
        }
    }, [loading, status]);

    return (
        <DataSetWizard
            id={id}
            dataSet={dataSet}
            updateDataSet={updateDataSet}
            projects={projects}
        />
    );
};

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

function useGetDataSetById(props: { id: Maybe<Id> }) {
    const { id } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [status, setStatus] = React.useState<HttpStatus>("idle");
    const [dataSet, updateDataSet] = React.useState<DataSet>(() => {
        return DataSet.create({
            access: [],
            coreCompetencies: [],
            created: "",
            description: "",
            id: getUid(new Date().getTime().toString()),
            lastUpdated: "",
            name: "",
            orgUnits: [],
            permissions: {
                data: Permission.create({ read: false, write: false }),
                metadata: Permission.create({ read: false, write: false }),
            },
            project: undefined,
            shortName: "",
            expiryDays: 0,
            openFuturePeriods: 0,
            notifyUser: false,
        });
    });

    React.useEffect(() => {
        if (!id) return;
        setStatus("loading");
        return compositionRoot.dataSets.getByIds.execute([id]).run(
            result => {
                const firstDataSet = result[0];
                if (firstDataSet) updateDataSet(firstDataSet);
                setStatus("finished");
            },
            error => {
                snackbar.error(error.message);
                setStatus("error");
            }
        );
    }, [compositionRoot.dataSets.getByIds, id, snackbar]);

    return { dataSet, status, updateDataSet };
}

export type HttpStatus = "idle" | "loading" | "finished" | "error";

export const RegisterDataSetPage = component(RegisterDataSetPage_);
