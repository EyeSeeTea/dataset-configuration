import React from "react";
import { Tabs, Tab, Tooltip } from "@material-ui/core";
import StorageIcon from "@material-ui/icons/Storage";
import FolderIcon from "@material-ui/icons/Folder";
import i18n from "$/utils/i18n";
import styled from "styled-components";
import { useNavigateTo } from "$/webapp/routes";

export const activeTabs = ["dataSets", "projects"] as const;
export type HomeTabsProps = { activeTab: ActiveTab };

export type ActiveTab = (typeof activeTabs)[number];

export const HomeTabs = React.memo((props: HomeTabsProps) => {
    const { navigateTo } = useNavigateTo();
    const tabIndex = activeTabs.indexOf(props.activeTab);

    const goToUrl = React.useCallback(
        (_event: React.ChangeEvent<{}>, value: number) => {
            const path = activeTabs[value];
            if (path) navigateTo(path);
        },
        [navigateTo]
    );

    return (
        <TabsContainer>
            <Tabs style={{ marginLeft: "auto" }} value={tabIndex} onChange={goToUrl}>
                <Tooltip title={i18n.t("DataSets")}>
                    <Tab icon={<StorageIcon />} />
                </Tooltip>
                <Tooltip title={i18n.t("Projects")}>
                    <Tab icon={<FolderIcon />} />
                </Tooltip>
            </Tabs>
        </TabsContainer>
    );
});

const TabsContainer = styled.section`
    display: flex;
    .MuiTabs-root {
        margin-left: auto;
    }
`;
