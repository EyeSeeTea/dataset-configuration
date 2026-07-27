import React from "react";

export function component<Props>(comp: React.FC<Props>) {
    comp.displayName = comp.name?.replace(/_+$/, "") || "UnknownComponent";
    return React.memo(comp);
}
