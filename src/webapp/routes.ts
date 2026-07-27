import React from "react";
import { Ref } from "$/domain/entities/Ref";
import { useHistory } from "react-router-dom";

const routes = {
    dataSets: () => "/",
    createDataSets: () => "/dataSets/create",
    editDataSets: ({ id }: Ref) => `/dataSets/${id}/edit`,
    projects: () => "/projects",
};

type Routes = typeof routes;
type RouteKey = keyof typeof routes;

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
        <Key extends RouteKey>(route: Key, ...args: Parameters<(typeof routes)[Key]>) => {
            const path = (routes[route] as any)(...args);
            history.push(path);
        },
        [history]
    );

    return navigateTo;
}

export function generateUrl<Name extends keyof Routes>(
    name: Name,
    params: Parameters<Routes[Name]>[0] = undefined
): string {
    const fn = routes[name];
    return params ? fn(params as any) : fn(undefined as any);
}
