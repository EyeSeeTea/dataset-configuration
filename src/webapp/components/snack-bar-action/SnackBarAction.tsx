import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";

type SnackBarActionProps = {
    message: string;
    buttonText: string;
    onClick: () => void;
};

export const SnackBarAction = React.memo((props: SnackBarActionProps) => {
    const { message, buttonText, onClick } = props;
    return (
        <>
            <span>{message}</span>
            <SnackBarButton variant="text" onClick={onClick}>
                {buttonText}
            </SnackBarButton>
        </>
    );
});

const SnackBarButton = styled(Button)`
    color: #fff;
`;
