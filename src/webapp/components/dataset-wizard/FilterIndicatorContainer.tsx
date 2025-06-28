import React from "react";
import styled from "styled-components";
import { Divider, Drawer, Grid, IconButton, Typography } from "@material-ui/core";
import FilterListIcon from "@material-ui/icons/FilterList";
import CloseIcon from "@material-ui/icons/Close";

import i18n from "$/utils/i18n";

export type FilterIndicatorsProps = {
    onClose: () => void;
    showCloseButton?: boolean;
    hideFilter: boolean;
    children?: React.ReactNode;
};

export type FilterWrapperProps = {
    mode: FilterMode;
    children: React.JSX.Element;
    showDrawer: boolean;
    onClose: () => void;
};

export type FilterMode = "default" | "drawer";

export const FilterWrapper = React.memo((props: FilterWrapperProps) => {
    const { children, mode, showDrawer, onClose } = props;

    switch (mode) {
        case "default":
            return (
                <Grid item lg={3}>
                    {children}
                </Grid>
            );
        case "drawer":
            return (
                <Drawer onClose={onClose} open={showDrawer}>
                    {children}
                </Drawer>
            );
        default:
            return null;
    }
});

export const FilterIndicatorsContainer: React.FC<FilterIndicatorsProps> = React.memo(props => {
    const { onClose, showCloseButton, children, hideFilter } = props;

    return (
        <FilterIndicatorContainer>
            <HeaderFilterContainer>
                {!hideFilter && (
                    <>
                        <FilterListIcon />
                        <Typography variant="body1">{i18n.t("Filters")}</Typography>
                    </>
                )}

                {showCloseButton && (
                    <IconButton className="icon" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                )}
            </HeaderFilterContainer>

            <Divider />
            {children}
        </FilterIndicatorContainer>
    );
});

const FilterIndicatorContainer = styled.div`
    max-width: 350px;
    display: flex;
    flex-direction: column;
    row-gap: 0.5em;
)`;

const HeaderFilterContainer = styled.div`
    align-items: center;
    display: flex;
    gap: 0.5em;
    padding-inline: 1em;

    .icon {
        margin-left: auto;
    }
`;
