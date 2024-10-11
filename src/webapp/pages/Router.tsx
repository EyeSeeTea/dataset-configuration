import { HashRouter, Route, Switch } from "react-router-dom";
import { LandingPage } from "./landing/LandingPage";
import { RegisterDataSetPage } from "$/webapp/pages/register-dataset/RegisterDataSetPage";

export function Router() {
    return (
        <HashRouter>
            <Switch>
                <Route path="/dataSets/create" render={() => <RegisterDataSetPage />} />
                <Route path="/dataSets/:id/edit" render={() => <RegisterDataSetPage />} />
                <Route render={() => <LandingPage />} />
            </Switch>
        </HashRouter>
    );
}
