import i18n from "$/utils/i18n";
import { Tooltip } from "@material-ui/core";
import React from "react";

export type TooltipTruncateProps = { items: string[]; maxItemsToShow?: number };

export const TooltipTruncate = React.memo((props: TooltipTruncateProps) => {
    const { items, maxItemsToShow = 3 } = props;

    const showMoreText = items.length > maxItemsToShow;
    const moreItems = showMoreText
        ? [i18n.t("and {{number}} more...", { number: items.length - maxItemsToShow })]
        : [];

    const itemsToShow = items.slice(0, maxItemsToShow).concat(moreItems);
    const joinItems = items.join(", ");

    return (
        <Tooltip title={showMoreText ? joinItems : ""}>
            <ul>
                {itemsToShow.map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </Tooltip>
    );
});

TooltipTruncate.displayName = "TooltipTruncate";
