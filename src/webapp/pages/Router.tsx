import { HashRouter, Redirect, Route, Switch } from "react-router-dom";
import { LandingPage } from "./landing/LandingPage";
import { RegisterDataSetPage } from "$/webapp/pages/register-dataset/RegisterDataSetPage";
import { ProjectPage } from "$/webapp/pages/projects/ProjectPage";

export function Router() {
    return (
        <HashRouter>
            <Switch>
                <Route path="/dataSets/create" render={() => <RegisterDataSetPage />} />
                <Route path="/dataSets/:id/edit" render={() => <RegisterDataSetPage />} />
                <Route path="/projects" render={() => <ProjectPage />} />
                <Route path="/dataSets" render={() => <LandingPage />} />
                <Redirect from="/" to="/dataSets" />
            </Switch>
        </HashRouter>
    );
}
