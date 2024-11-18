import React from "react";
import { ConfirmationDialog, OrgUnitsSelector } from "@eyeseetea/d2-ui-components";
import { Grid, IconButton, Typography, TextField, Button } from "@material-ui/core";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

import { DataSet } from "$/domain/entities/DataSet";
import i18n from "$/utils/i18n";
import { useAppContext } from "$/webapp/contexts/app-context";

export type SetupDataSetProps = { dataSet?: DataSet };

export const SetupDataSet = React.memo((props: SetupDataSetProps) => {
    const { api } = useAppContext();
    const { dataSet } = props;
    const [projectModalOpen, setProjectModalOpen] = React.useState(false);

    const openProjectModal = React.useCallback(() => {
        setProjectModalOpen(true);
    }, []);

    return (
        <form>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        placeholder={i18n.t("Select Project")}
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={openProjectModal}>
                                    <OpenInNewIcon />
                                </IconButton>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        placeholder={i18n.t("DataSet name")}
                        defaultValue={dataSet?.name}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        placeholder={i18n.t("DataSet description")}
                        defaultValue={dataSet?.description}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField fullWidth placeholder={i18n.t("Start Date")} />
                </Grid>
                <Grid item xs={6}>
                    <TextField fullWidth placeholder={i18n.t("End Date")} />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6">{i18n.t("Select org units")}</Typography>
                </Grid>
                <Grid item xs={12}>
                    <OrgUnitsSelector api={api} />
                </Grid>
            </Grid>

            {projectModalOpen && (
                <ConfirmationDialog
                    open
                    cancelText={i18n.t("Cancel")}
                    onCancel={() => setProjectModalOpen(false)}
                >
                    <Grid container>
                        <Grid item xs={12}>
                            <Button onClick={() => setProjectModalOpen(false)} color="primary">
                                AFFM2227 (Education Cannot Wait)
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Button onClick={() => setProjectModalOpen(false)} color="primary">
                                CMFM2402 (Sida)
                            </Button>
                        </Grid>
                    </Grid>
                </ConfirmationDialog>
            )}
        </form>
    );
});
