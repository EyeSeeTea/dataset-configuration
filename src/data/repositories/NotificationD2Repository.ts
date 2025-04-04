import { apiToFuture } from "$/data/api-futures";
import { NotificationMessage } from "$/domain/entities/NotificationMessage";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { D2Api } from "$/types/d2-api";

export class NotificationD2Repository {
    constructor(private api: D2Api) {}

    send(notification: NotificationMessage): FutureData<void> {
        if (notification.recipients.length === 0) return Future.void();

        return apiToFuture(
            this.api.messageConversations.post({
                subject: notification.title,
                text: notification.body,
                userGroups: notification.recipients.map(recipient => ({ id: recipient })),
            })
        ).toVoid();
    }
}
