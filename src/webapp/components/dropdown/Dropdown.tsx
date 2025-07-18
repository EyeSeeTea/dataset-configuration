import { FormControl, InputLabel, MenuItem, MuiThemeProvider, Select } from "@material-ui/core";
import React from "react";
import { createTheme } from "@material-ui/core/styles";
import { cyan } from "@material-ui/core/colors";

import i18n from "../../../utils/i18n";

export type DropdownItem<Value extends string = string> = {
    value: Value;
    text: string;
    disabled?: boolean;
};

export interface DropdownProps<Value extends string = string> {
    className?: string;
    items: DropdownItem[];
    onChange: (value: Value | undefined) => void;
    label?: string;
    value?: Value;
    hideEmpty?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = React.memo(props => {
    const { items, value, onChange, label, hideEmpty, className } = props;

    const selectValue =
        value === undefined || !items.map(item => item.value).includes(value) ? "" : value;

    return (
        <MuiThemeProvider theme={getMaterialTheme}>
            <FormControl className={className}>
                <InputLabel>{label}</InputLabel>
                <Select
                    data-cy={label}
                    value={selectValue}
                    onChange={ev => onChange((ev.target.value as string) || undefined)}
                    MenuProps={{
                        getContentAnchorEl: null,
                        anchorOrigin: { vertical: "bottom", horizontal: "left" },
                    }}
                >
                    {!hideEmpty && <MenuItem value={""}>{i18n.t("<No value>")}</MenuItem>}
                    {items.map(item => (
                        <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                            {item.text}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </MuiThemeProvider>
    );
});

const getMaterialTheme = () =>
    createTheme({
        overrides: {
            MuiFormLabel: {
                root: {
                    color: "#aaaaaa",
                    "&$focused": {
                        color: "#aaaaaa",
                    },
                    top: "-9px !important",
                    marginLeft: 10,
                },
            },
            MuiInput: {
                root: {
                    marginLeft: 10,
                    width: "100%",
                },
                formControl: {
                    minWidth: 150,
                    marginTop: "8px !important",
                },
                input: {
                    color: "#565656",
                },
                underline: {
                    "&&&&:hover:before": {
                        borderBottom: `1px solid #bdbdbd`,
                    },
                    "&:hover:not($disabled):before": {
                        borderBottom: `1px solid #aaaaaa`,
                    },
                    "&:after": {
                        borderBottom: `2px solid ${cyan["500"]}`,
                    },
                    "&:before": {
                        borderBottom: `1px solid #bdbdbd`,
                    },
                },
            },
        },
    });
