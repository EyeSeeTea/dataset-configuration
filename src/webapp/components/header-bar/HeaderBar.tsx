import styled from "styled-components";
import { HeaderBar as D2HeaderBar } from "@dhis2/ui";

type HeaderBarProps = {
    appName: string;
};

export const HeaderBar: React.FC<HeaderBarProps> = props => {
    const { appName } = props;
    const shouldRenderHeaderBar = window.self === window.top;
    return shouldRenderHeaderBar && <StyledHeaderBar appName={appName} />;
};

const StyledHeaderBar = styled(D2HeaderBar)`
    div:first-of-type {
        box-sizing: border-box;
    }
`;
