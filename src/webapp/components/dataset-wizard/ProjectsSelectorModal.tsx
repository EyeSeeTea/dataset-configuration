import React from "react";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { Grid, Button, Checkbox, FormControlLabel, TextField } from "@material-ui/core";
import { FixedSizeList as List } from "react-window";
import i18n from "$/utils/i18n";
import { Project } from "$/domain/entities/Project";
import { component } from "$/utils/react";
import { Maybe } from "$/utils/ts-utils";

export type ProjectsSelectorModalProps = {
    onChange: (project: Maybe<Project>) => void;
    onClose: () => void;
    projects: Project[];
};

const ProjectsSelectorModal_ = React.memo((props: ProjectsSelectorModalProps) => {
    const { onClose, onChange, projects } = props;
    const [showClosedProjects, setShowClosedProjects] = React.useState(false);
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
            const matchesSearch =
                !searchProject || project.name.toLowerCase().includes(searchProject.toLowerCase());

            return showClosedProjects ? matchesSearch : matchesSearch && project.isOpen;
        });
    }, [projects, searchProject, showClosedProjects]);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const project = projectsToShow[index];
        if (!project) return null;

        return (
            <div style={{ ...style, width: "initial" }}>
                <Grid item xs={12}>
                    <Button
                        onClick={() => onSelectProject(project)}
                        color="primary"
                        disableElevation
                    >
                        {project.name}
                    </Button>
                </Grid>
            </div>
        );
    };

    return (
        <ConfirmationDialog open cancelText={i18n.t("Cancel")} onCancel={onClose} fullWidth>
            <Grid container>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showClosedProjects}
                                onChange={event => setShowClosedProjects(event.target.checked)}
                            />
                        }
                        label={i18n.t("Show closed projects")}
                    />
                </Grid>
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
                    {Row}
                </List>
            </Grid>
        </ConfirmationDialog>
    );
});

export const ProjectsSelectorModal = component(ProjectsSelectorModal_);
