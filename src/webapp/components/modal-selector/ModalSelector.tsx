import React from "react";
import { FixedSizeList as List } from "react-window";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { Button, Grid, IconButton, TextField } from "@material-ui/core";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";

import i18n from "$/utils/i18n";
import { component } from "$/utils/react";
import { Maybe } from "$/utils/ts-utils";
import { useBooleanState } from "$/webapp/hooks/useBooleanState";

const _ModalSelector = React.memo((props: ModalSelectorProps) => {
    const { label, onChange, items, value, showEmptyValue } = props;
    const [openModal, modalActions] = useBooleanState(false);
    const [search, setSearch] = React.useState("");

    const onSelectItem = React.useCallback(
        (item: Maybe<ModalSelectorItem>) => {
            onChange(item);
            modalActions.disable();
        },
        [onChange, modalActions]
    );

    const itemsToRender = React.useMemo(() => {
        return items.filter(item => {
            const matchesSearch = !search || item.text.toLowerCase().includes(search.toLowerCase());

            return matchesSearch;
        });
    }, [items, search]);

    // const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    //     const item = itemsToRender[index];
    //     if (!item) return null;

    //     return (
    //         <div style={{ ...style, width: "initial" }}>
    //             <Grid item xs={12}>
    //                 <Button onClick={() => onSelectItem(item)} color="primary" disableElevation>
    //                     {item.text}
    //                 </Button>
    //             </Grid>
    //         </div>
    //     );
    // };

    const selectedValue = items.find(item => item.value === value);

    return (
        <>
            <TextField
                fullWidth
                label={label}
                onClick={() => modalActions.enable()}
                InputProps={{
                    readOnly: true,
                    endAdornment: (
                        <IconButton onClick={() => modalActions.enable()}>
                            <OpenInNewIcon />
                        </IconButton>
                    ),
                }}
                value={selectedValue?.text ?? ""}
            />
            <ConfirmationDialog
                open={openModal}
                cancelText={i18n.t("Cancel")}
                onCancel={() => modalActions.disable()}
                fullWidth
            >
                <Grid container>
                    <Grid item xs={12}>
                        <TextField
                            value={search}
                            label={i18n.t("Filter list")}
                            onChange={event => setSearch(event.target.value)}
                        />
                    </Grid>

                    {showEmptyValue && (
                        <Button color="primary" onClick={() => onSelectItem(undefined)}>
                            {i18n.t("<No value>")}
                        </Button>
                    )}
                    <List
                        itemData={itemsToRender}
                        height={500}
                        itemCount={itemsToRender.length}
                        itemSize={30}
                        width="100%"
                    >
                        {rowProps => {
                            const item = itemsToRender[rowProps.index];
                            if (!item) return null;
                            return (
                                <Row
                                    item={item}
                                    onSelectItem={onSelectItem}
                                    style={rowProps.style}
                                    key={item.value}
                                />
                            );
                        }}
                    </List>
                </Grid>
            </ConfirmationDialog>
        </>
    );
});

const Row = ({
    item,
    style,
    onSelectItem,
}: {
    item: ModalSelectorItem;
    style: React.CSSProperties;
    onSelectItem: (item: ModalSelectorItem) => void;
}) => {
    return (
        <div style={{ ...style, width: "initial" }}>
            <Grid item xs={12}>
                <Button onClick={() => onSelectItem(item)} color="primary" disableElevation>
                    {item.text}
                </Button>
            </Grid>
        </div>
    );
};

export const ModalSelector = component(_ModalSelector);

export type ModalSelectorItem = { text: string; value: string };

export type ModalSelectorProps = {
    label: string;
    onChange: (item: Maybe<ModalSelectorItem>) => void;
    items: ModalSelectorItem[];
    value: Maybe<string>;
    showEmptyValue?: boolean;
};
