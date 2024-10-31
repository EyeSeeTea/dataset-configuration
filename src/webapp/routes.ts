import React from "react";
import { Ref } from "$/domain/entities/Ref";
import { useHistory } from "react-router-dom";

const routes = {
    dataSets: () => "/",
    createDataSets: () => "/dataSets/create",
    editDataSets: ({ id }: Ref) => `/dataSets/:${id}/edit`,
    projects: () => "/projects",
};

type RouteKey = keyof typeof routes;
type RouteParams<T extends RouteKey> = Parameters<(typeof routes)[T]>[0] extends undefined
    ? void
    : Parameters<(typeof routes)[T]>[0];

export function buildRoute<T extends RouteKey>(
    route: T,
    params?: Parameters<(typeof routes)[T]>[0]
): string {
    const routeBuilder = routes[route];
    return routeBuilder(params as any);
}

export function useNavigateTo() {
    const history = useHistory();

    const navigateTo = React.useCallback(
        <T extends RouteKey>(route: T, params?: RouteParams<T>) => {
            const path = (routes[route] as any)(params);
            history.push(path);
        },
        [history]
    );

    return { navigateTo };
}
