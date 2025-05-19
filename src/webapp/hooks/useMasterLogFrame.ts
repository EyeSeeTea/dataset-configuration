import React from "react";
import { useAppContext } from "$/webapp/contexts/app-context";
import { MasterLogFrame } from "$/domain/entities/MasterLogFrame";

export function useGetMasterLogFrameByCodes(codes: string[]) {
    const { compositionRoot } = useAppContext();
    const [masterLogFrames, setMasterLogFrames] = React.useState<MasterLogFrame[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string>();

    React.useEffect(() => {
        if (codes.length === 0) return;
        setLoading(true);
        return compositionRoot.masterLogFrames.getByCode.execute({ codes: codes }).run(
            masterLogFrames => {
                setMasterLogFrames(masterLogFrames);
                setLoading(false);
            },
            error => {
                setError(error.message);
                setLoading(false);
            }
        );
    }, [codes, compositionRoot.masterLogFrames.getByCode]);

    return { error, loading, masterLogFrames };
}
