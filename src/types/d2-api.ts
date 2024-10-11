import { D2Api } from "@eyeseetea/d2-api/2.36";
import { getMockApiFromClass } from "@eyeseetea/d2-api";

export { CancelableResponse } from "@eyeseetea/d2-api";
export { D2Api } from "@eyeseetea/d2-api/2.36";
export type { MetadataPick } from "@eyeseetea/d2-api/2.36";
export const getMockApi = getMockApiFromClass(D2Api);

interface LocalInstance {
    type: "local";
    url: string;
}

interface ExternalInstance {
    type: "external";
    url: string;
    username: string;
    password: string;
}

export type DhisInstance = LocalInstance | ExternalInstance;

export function getD2APiFromInstance(instance: DhisInstance) {
    return new D2Api({
        baseUrl: instance.url,
        auth:
            instance.type === "external"
                ? { username: instance.username, password: instance.password }
                : undefined,
        backend: "fetch",
    });
}
