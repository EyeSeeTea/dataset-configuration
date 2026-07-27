import { render, RenderResult } from "@testing-library/react";
import { SnackbarProvider } from "@eyeseetea/d2-ui-components";
import { ReactNode } from "react";
import { AppContext, AppContextState } from "$/webapp/contexts/app-context";
import { getTestCompositionRoot } from "$/CompositionRoot";
import { createAdminUser } from "$/domain/entities/__tests__/userFixtures";
import { D2Api } from "$/types/d2-api";
import { Config } from "$/domain/entities/Config";
import { outcomeOutputTestData } from "$/webapp/pages/app/__tests__/App.spec";

export const configTest: Config = {
    categoryCombinations: [],
    indicators: [],
    regions: [{ id: "ISeK6bTD3hr", code: "AF", name: "Afghanistan" }],
    userGroups: [
        { id: "JqI1AgplhXe", code: "AF", name: "AF_Administrators" },
        { id: "da40GWQupNL", code: "AF", name: "AF_Users" },
    ],
    periodEndDateDay: 1,
    periodEndDateMonth: 4,
    periodLastYearEndDate: 0,
    periodLastYearUnits: "month",
    notificationUserGroup: { id: "EVSddRDWk5i", code: "GL_admin", name: "GL_GlobalAdministrator" },
    ...outcomeOutputTestData,
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
