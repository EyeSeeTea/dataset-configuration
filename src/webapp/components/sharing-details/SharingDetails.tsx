import i18n from "$/utils/i18n";
import styled from "styled-components";
import React from "react";
import _ from "$/domain/entities/generic/Collection";
import { DataSetColumns } from "$/webapp/components/dataset-table/DataSetTable";

export type SharingDetailsProps = {
    dataSet: DataSetColumns;
};

export const SharingDetails = React.memo((props: SharingDetailsProps) => {
    const { dataSet } = props;
    const accessByType = _(dataSet.access).groupBy(access => access.type);

    return (
        <div>
            <PermissionItem
                label={i18n.t("Public Access")}
                description={dataSet.permissionDescription}
            />
            {accessByType
                .mapValues(([type, accessData]) => {
                    const accessTypeLabel =
                        type === "users" ? i18n.t("User access") : i18n.t("Groups");
                    return (
                        <PermissionItem
                            key={type}
                            label={accessTypeLabel}
                            description={accessData.map(access => access.name).join(", ")}
                        />
                    );
                })
                .values()}
        </div>
    );
});

export const PermissionItem = React.memo((props: { label: string; description: string }) => {
    const { label, description } = props;
    return (
        <StyledSharingDetails>
            <strong>{label}: </strong>
            <span>{description}</span>
        </StyledSharingDetails>
    );
});

const StyledSharingDetails = styled.p`
    color: #4d4b4b;
    font-style: italic;
`;

SharingDetails.displayName = "SharingDetails";
