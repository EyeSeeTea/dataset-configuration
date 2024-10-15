import React from "react";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import i18n from "$/utils/i18n";

export type ConfirmationModalProps = {
    visible: boolean;
    onSave: () => void;
    onCancel: () => void;
};

export const ConfirmationModal = React.memo((props: ConfirmationModalProps) => {
    const { visible, onSave, onCancel } = props;
    return (
        <ConfirmationDialog
            open={visible}
            onCancel={onCancel}
            title={i18n.t("Are you sure you want to delete this/those dataset(s)?")}
            description={i18n.t("This action cannot be undone.")}
            saveText={i18n.t("Delete")}
            cancelText={i18n.t("Cancel")}
            onSave={onSave}
        />
    );
});
