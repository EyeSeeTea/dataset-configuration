import React from "react";
import i18n from "$/utils/i18n";
import { MultiSelector } from "@eyeseetea/d2-ui-components";
import { component } from "$/utils/react";
import { DataSet } from "$/domain/entities/DataSet";
import { useAppContext } from "$/webapp/contexts/app-context";
import _ from "$/domain/entities/generic/Collection";
import { Config } from "$/domain/entities/Config";

export type ShareOptionsDataSetProps = { dataSet: DataSet; onChange: (dataSet: DataSet) => void };

export type SelectorItem = { text: string; value: string };

export const ShareOptionsDataSet_ = React.memo((props: ShareOptionsDataSetProps) => {
    const { config } = useAppContext();
    const { dataSet, onChange } = props;

    const regionsCodes = dataSet.getRegionCodesFromAccess();

    const selectedRegions = config.regions.filter(region => regionsCodes.includes(region.code));

    const updateRegions = React.useCallback(
        (regionsCodes: string[]) => {
            const updateData = dataSet.updateAccessFromRegionsCodes(regionsCodes, config);
            onChange(updateData);
        },
        [config, onChange, dataSet]
    );

    return (
        <div>
            <p>{i18n.t("Please select the regions you want to share this dataSet with")}</p>
            <MultiSelector
                d2={{}}
                ordered
                options={filterRegionsWithoutUserGroups(config).map(region => ({
                    text: region.name,
                    value: region.code,
                }))}
                selected={selectedRegions.map(region => region.code)}
                onChange={updateRegions}
            />
        </div>
    );
});

export const ShareOptionsDataSet = component(ShareOptionsDataSet_);

function filterRegionsWithoutUserGroups(config: Config) {
    const result = config.regions.filter(region => {
        return config.userGroups.some(userGroup => userGroup.code === region.code);
    });
    return result;
}
