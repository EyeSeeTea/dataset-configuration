import { NotificationMessage } from "$/domain/entities/NotificationMessage";
import { FutureData } from "$/domain/entities/generic/Future";

export interface NotificationRepository {
    send(notification: NotificationMessage): FutureData<void>;
}
