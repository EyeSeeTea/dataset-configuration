import styled from "styled-components";
import { HeaderBar } from "@dhis2/ui";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { MuiThemeProvider } from "@material-ui/core/styles";
//@ts-ignore
import OldMuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "$/CompositionRoot";
import { AppContext, AppContextState } from "$/webapp/contexts/app-context";
import { Router } from "$/webapp/pages/Router";
import "./App.css";
import muiThemeLegacy from "./themes/dhis2-legacy.theme";
import { muiTheme } from "./themes/dhis2.theme";

export interface AppProps {
    compositionRoot: CompositionRoot;
}

function App(props: AppProps) {
    const { compositionRoot } = props;
    const [loading, setLoading] = useState(true);
    const [appContext, setAppContext] = useState<AppContextState | null>(null);

    useEffect(() => {
        async function setup() {
            const currentUser = await compositionRoot.users.getCurrent.execute().toPromise();
            if (!currentUser) throw new Error("User not logged in");

            setAppContext({ currentUser, compositionRoot });
            setLoading(false);
        }
        setup();
    }, [compositionRoot]);

    if (loading) return null;

    return (
        <MuiThemeProvider theme={muiTheme}>
            <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                <SnackbarProvider>
                    <StyledHeaderBar appName="Project Configuration app" />

                    <div id="app" className="content">
                        <AppContext.Provider value={appContext}>
                            <Router />
                        </AppContext.Provider>
                    </div>
                </SnackbarProvider>
            </OldMuiThemeProvider>
        </MuiThemeProvider>
    );
}

const StyledHeaderBar = styled(HeaderBar)`
    div:first-of-type {
        box-sizing: border-box;
    }
`;

export default React.memo(App);
