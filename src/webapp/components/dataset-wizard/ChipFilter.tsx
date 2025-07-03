import React from "react";
import { Chip, Typography } from "@material-ui/core";
import styled from "styled-components";

export type ChipFilterProps = {
    allowEmpty?: boolean;
    items: ChipItem[];
    label: string;
    onChange: (item: ChipItem[]) => void;
    value: string[];
    mode?: "single" | "multiple";
    noItemsMessage?: string;
};

export type ChipItem = { text: string; value: string };

export const ChipFilter = React.memo((props: ChipFilterProps) => {
    const {
        allowEmpty,
        items,
        label,
        onChange,
        value: selectedValues,
        mode = "single",
        noItemsMessage,
    } = props;

    const handleChipClick = (itemValue: string) => {
        const currentItem = items.find(item => item.value === itemValue);

        if (!currentItem) return;

        if (mode === "single") {
            if (allowEmpty && selectedValues.includes(itemValue)) {
                onChange([]);
                return;
            }
            onChange([currentItem]);
        } else {
            const isSelected = selectedValues.includes(itemValue);
            const updatedItems = isSelected
                ? selectedValues
                      .filter(
                          value => value !== itemValue && items.find(item => item.value === value)
                      )
                      .map(value => ({ text: value, value }))
                : [...selectedValues, itemValue]
                      .filter(value => items.find(item => item.value === value))
                      .map(value => ({ text: value, value }));

            onChange(updatedItems);
        }
    };

    const isSelected = (itemValue: string) => selectedValues.includes(itemValue);

    return (
        <BodyFilterContainer>
            <Typography variant="body1">
                <strong>{label}</strong>
            </Typography>

            <ScopeContainer className="scope-container">
                {items.map(item => (
                    <Chip
                        key={item.value}
                        color={isSelected(item.value) ? "primary" : "default"}
                        label={item.text}
                        onClick={() => handleChipClick(item.value)}
                        variant="default"
                    />
                ))}
                {items.length === 0 && noItemsMessage && (
                    <TypographyError variant="body2" color="error">
                        {noItemsMessage}
                    </TypographyError>
                )}
            </ScopeContainer>
        </BodyFilterContainer>
    );
});

const BodyFilterContainer = styled.div`
    padding-inline: 1em;
`;

const ScopeContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    padding-block: 1em;
`;

const TypographyError = styled(Typography)`
    color: red;
    font-weight: bold;
`;
