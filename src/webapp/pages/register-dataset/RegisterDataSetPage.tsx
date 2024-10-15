import { Ref } from "$/domain/entities/Ref";
import { DataSetWizard } from "$/webapp/components/dataset-wizard/DataSetWizard";
import { useParams } from "react-router";

export const RegisterDataSetPage = () => {
    const { id } = useParams<Partial<Ref>>();
    return <DataSetWizard id={id} />;
};

RegisterDataSetPage.displayName = "RegisterDataSetPage";
