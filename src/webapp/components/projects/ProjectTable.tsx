import React from "react";
import {
    ObjectsTable,
    useLoading,
    useObjectsTable,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";
import DetailsIcon from "@material-ui/icons/Details";

import { DataSet } from "$/domain/entities/DataSet";
import { ProjectAttrs } from "$/domain/entities/Project";
import i18n from "$/utils/i18n";
import { TooltipTruncate } from "$/webapp/components/tooltip-truncate/TooltipTruncate";
import { useAppContext } from "$/webapp/contexts/app-context";

type ProjectColumns = ProjectAttrs & { orgUnits: string; coreCompetencies: string };

function objIsDataSet(project: ProjectColumns): boolean {
    return project instanceof DataSet;
}

export const ProjectTable = React.memo(() => {
    const { compositionRoot } = useAppContext();
    const loading = useLoading();
    const snackbar = useSnackbar();

    const tableConfig = useObjectsTable<ProjectColumns>(
        React.useMemo(() => {
            return {
                forceSelectionColumn: true,
                actions: [
                    {
                        name: "details",
                        text: i18n.t("Details"),
                        icon: <DetailsIcon />,
                        primary: true,
                    },
                ],
                details: [
                    {
                        name: "name",
                        text: i18n.t("Name"),
                    },
                    {
                        name: "lastUpdated",
                        text: i18n.t("Last updated"),
                    },
                    {
                        name: "dataSets",
                        text: i18n.t("DataSets"),
                        getValue: project => {
                            if (objIsDataSet(project)) {
                                return " - ";
                            } else {
                                return project.dataSets.map(dataSet => dataSet.name).join(", ");
                            }
                        },
                    },
                ],
                columns: [
                    {
                        name: "name",
                        text: i18n.t("Name"),
                    },
                    {
                        name: "lastUpdated",
                        text: i18n.t("Last updated"),
                    },
                    {
                        name: "orgUnits",
                        text: i18n.t("Org. Units"),
                        sortable: false,
                        getValue: project => {
                            if (project instanceof DataSet) {
                                const items = project.orgUnits.map(x => x.name);
                                return <TooltipTruncate items={items} />;
                            } else {
                                return " - ";
                            }
                        },
                    },
                    {
                        name: "coreCompetencies",
                        text: i18n.t("Core Competencies"),
                        sortable: false,
                    },
                ],
                initialSorting: { field: "name", order: "asc" },
                paginationOptions: { pageSizeInitialValue: 50, pageSizeOptions: [50, 100, 200] },
                searchBoxLabel: i18n.t("Search"),
                childrenKeys: ["dataSets"],
            };
        }, []),
        React.useCallback(
            (search, pagination, sorting) => {
                loading.show(true, i18n.t("Loading projects..."));
                return new Promise((resolve, reject) => {
                    return compositionRoot.projects.get
                        .execute({
                            paging: { page: pagination.page, pageSize: pagination.pageSize },
                            sorting: { field: sorting.field, order: sorting.order },
                            filters: { search },
                        })
                        .run(
                            response => {
                                loading.hide();
                                return resolve({
                                    objects: response.data.map(project => {
                                        return {
                                            ...project,
                                            orgUnits: " - ",
                                            coreCompetencies: " - ",
                                        };
                                    }),
                                    pager: {
                                        page: response.page,
                                        pageCount: response.pageCount,
                                        total: response.total,
                                        pageSize: response.pageSize,
                                    },
                                });
                            },
                            error => {
                                loading.hide();
                                snackbar.error(error.message);
                                return reject(new Error(error.message));
                            }
                        );
                });
            },
            [compositionRoot.projects.get, loading, snackbar]
        )
    );

    return (
        <>
            <ObjectsTable {...tableConfig} />
        </>
    );
});
