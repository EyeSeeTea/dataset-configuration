import React from "react";
import i18n from "$/utils/i18n";
import { MultiSelector } from "@eyeseetea/d2-ui-components";

export type ShareOptionsDataSetProps = {};
export type SelectorItem = { text: string; value: string };

export const ShareOptionsDataSet = React.memo((_props: ShareOptionsDataSetProps) => {
    const [selected, setSelected] = React.useState<string[]>([]);

    const items: SelectorItem[] = [
        {
            text: "Algeria",
            value: "Bangladesh",
        },
        {
            text: "Brazil",
            value: "Brazil",
        },
        {
            text: "Canada",
            value: "Canada",
        },
    ];

    return (
        <div>
            <p>{i18n.t("Please select the regions you want to share this dataSet with")}</p>
            <MultiSelector
                d2={{}}
                ordered
                options={items}
                selected={selected}
                onChange={setSelected}
            />
        </div>
    );
});

ShareOptionsDataSet.displayName = "ShareOptionsDataSet";
