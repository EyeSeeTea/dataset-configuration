import { Id } from "$/domain/entities/Ref";

export type NotificationMessage = {
    recipients: Id[];
    title: string;
    body: string;
};
