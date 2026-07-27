import { D2Api, D2ApiDefinition, D2Attribute, MetadataPick } from "@eyeseetea/d2-api/2.42";
import { D2AttributeValueGeneric } from "@eyeseetea/d2-api/schemas";

export { CancelableResponse } from "@eyeseetea/d2-api";
export { D2Api } from "@eyeseetea/d2-api/2.42";
export type { MetadataPick, DataStore, MetadataResponse } from "@eyeseetea/d2-api/2.42";

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
export type D2AttributeValue = D2AttributeValueGeneric<D2Attribute>;

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

export type D2ApiMetadataType<K extends keyof D2ApiDefinition["schemas"], Fields> = MetadataPick<{
    [P in K]: { fields: Fields };
}>[K][number];
