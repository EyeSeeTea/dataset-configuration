import { render, RenderResult } from "@testing-library/react";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { ReactNode } from "react";
import { AppContext, AppContextState } from "$/webapp/contexts/app-context";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createAdminUser } from "$/domain/entities/__tests__/userFixtures";
import { D2Api } from "$/types/d2-api";

export const configTest = {
    regions: [{ id: "ISeK6bTD3hr", code: "AF", name: "Afghanistan" }],
    userGroups: [
        { id: "JqI1AgplhXe", code: "AF", name: "AF_Administrators" },
        { id: "da40GWQupNL", code: "AF", name: "AF_Users" },
    ],
};

export function getTestContext() {
    const context: AppContextState = {
        currentUser: createAdminUser(),
        compositionRoot: getTestCompositionRoot(),
        api: {} as D2Api,
        config: configTest,
    };

    return context;
}

export function getReactComponent(children: ReactNode): RenderResult {
    const context = getTestContext();

    return render(
        <AppContext.Provider value={context}>
            <SnackbarProvider>{children}</SnackbarProvider>
        </AppContext.Provider>
    );
}
