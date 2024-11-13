import { HashRouter, Redirect, Route, Switch } from "react-router-dom";
import { LandingPage } from "./landing/LandingPage";
import { RegisterDataSetPage } from "$/webapp/pages/register-dataset/RegisterDataSetPage";
import { ProjectPage } from "$/webapp/pages/projects/ProjectPage";
import { generateUrl } from "$/webapp/routes";

export function Router() {
    return (
        <HashRouter>
            <Switch>
                <Route
                    path={generateUrl("createDataSets")}
                    render={() => <RegisterDataSetPage />}
                />
                <Route
                    path={generateUrl("editDataSets", { id: ":id" })}
                    render={() => <RegisterDataSetPage />}
                />
                <Route path={generateUrl("projects")} render={() => <ProjectPage />} />
                <Route path={generateUrl("dataSets")} render={() => <LandingPage />} />
                <Redirect from="/" to={generateUrl("dataSets")} />
            </Switch>
        </HashRouter>
    );
}
