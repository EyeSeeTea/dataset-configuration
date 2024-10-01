import { HashRouter, Route, Switch } from "react-router-dom";
import { LandingPage } from "./landing/LandingPage";

export function Router() {
    return (
        <HashRouter>
            <Switch>
                <Route render={() => <LandingPage />} />
            </Switch>
        </HashRouter>
    );
}
