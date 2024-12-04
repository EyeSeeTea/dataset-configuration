import styled from "styled-components";
import { HeaderBar } from "@dhis2/ui";
import { LoadingProvider, SnackbarProvider } from "@eyeseetea/d2-ui-components";
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
import { D2Api } from "$/types/d2-api";
import { Config } from "$/domain/entities/Config";

export interface AppProps {
    compositionRoot: CompositionRoot;
    api: D2Api;
    config: Config;
}

function App(props: AppProps) {
    const { api, config, compositionRoot } = props;
    const [loading, setLoading] = useState(true);
    const [appContext, setAppContext] = useState<AppContextState | null>(null);

    useEffect(() => {
        async function setup() {
            const currentUser = await compositionRoot.users.getCurrent.execute().toPromise();
            if (!currentUser) throw new Error("User not logged in");

            setAppContext({ config, api, currentUser, compositionRoot });
            setLoading(false);
        }
        setup();
    }, [config, compositionRoot, api]);

    if (loading) return null;

    return (
        <MuiThemeProvider theme={muiTheme}>
            <OldMuiThemeProvider muiTheme={muiThemeLegacy}>
                {/* @ts-ignore */}
                <LoadingProvider>
                    <SnackbarProvider>
                        <StyledHeaderBar appName="Project Configuration app" />

                        <div id="app" className="content">
                            <AppContext.Provider value={appContext}>
                                <Router />
                            </AppContext.Provider>
                        </div>
                    </SnackbarProvider>
                </LoadingProvider>
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
