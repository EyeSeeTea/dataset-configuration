import React from "react";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import {
    Grid,
    Button,
    Checkbox,
    FormControlLabel,
    TextField,
    LinearProgress,
} from "@material-ui/core";
import { FixedSizeList as List } from "react-window";
import i18n from "$/utils/i18n";
import { Project } from "$/domain/entities/Project";
import { component } from "$/utils/react";
import { Maybe } from "$/utils/ts-utils";

export type ProjectsSelectorModalProps = {
    onChange: (project: Maybe<Project>) => void;
    onCloseProjects: (value: boolean) => void;
    showClosedProjects: boolean;
    onClose: () => void;
    projects: Project[];
    isLoading: boolean;
};

const ProjectsSelectorModal_ = React.memo((props: ProjectsSelectorModalProps) => {
    const { onClose, onChange, isLoading, projects, onCloseProjects, showClosedProjects } = props;
    const [searchProject, setSearchProject] = React.useState("");

    const onSelectProject = React.useCallback(
        (project: Project) => {
            onChange(project);
            onClose();
        },
        [onChange, onClose]
    );

    const projectsToShow = React.useMemo(() => {
        return projects.filter(project => {
            return project.name.toLowerCase().includes(searchProject.toLowerCase());
        });
    }, [projects, searchProject]);

    return (
        <ConfirmationDialog open cancelText={i18n.t("Cancel")} onCancel={onClose} fullWidth>
            <Grid container>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showClosedProjects}
                                onChange={event => onCloseProjects(event.target.checked)}
                            />
                        }
                        label={i18n.t("Show closed projects")}
                    />
                </Grid>

                {isLoading && (
                    <Grid item xs={12}>
                        <LinearProgress variant="indeterminate" />
                    </Grid>
                )}

                <Grid item xs={12}>
                    <TextField
                        value={searchProject}
                        label={i18n.t("Filter projects")}
                        onChange={event => setSearchProject(event.target.value)}
                    />
                </Grid>

                <Button color="primary" onClick={() => onChange(undefined)}>
                    {i18n.t("<No value>")}
                </Button>
                <List height={500} itemCount={projectsToShow.length} itemSize={30} width="100%">
                    {rowProps => {
                        const project = projectsToShow[rowProps.index];
                        if (!project) return null;
                        return (
                            <div style={{ ...rowProps.style, width: "initial" }}>
                                <ProjectItem
                                    isLoading={isLoading}
                                    project={project}
                                    onSelectProject={onSelectProject}
                                    key={project.id}
                                />
                            </div>
                        );
                    }}
                </List>
            </Grid>
        </ConfirmationDialog>
    );
});

function ProjectItem(props: {
    project: Project;
    onSelectProject: (project: Project) => void;
    isLoading: boolean;
}) {
    const { project, onSelectProject, isLoading } = props;

    return (
        <Grid item xs={12}>
            <Button
                onClick={() => onSelectProject(project)}
                color="primary"
                disableElevation
                disabled={isLoading}
            >
                {project.name}
            </Button>
        </Grid>
    );
}

export const ProjectsSelectorModal = component(ProjectsSelectorModal_);
