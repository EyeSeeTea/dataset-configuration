import { DataSet } from "$/domain/entities/DataSet";
import { Log, LogAction, LogStatus } from "$/domain/entities/Log";
import { User } from "$/domain/entities/User";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { UserRepository } from "$/domain/repositories/UserRepository";
import i18n from "$/utils/i18n";

export class UserUtils {
    constructor(private userRepository: UserRepository, private logRepository: LogRepository) {}

    getCurrentUser(): FutureData<User> {
        return this.userRepository.getCurrent();
    }

    logAction(options: {
        dataSets: Log["dataSets"];
        status: LogStatus;
        action: LogAction;
    }): FutureData<void> {
        const { dataSets, status, action } = options;
        return this.getCurrentUser().flatMap(user => {
            const log = Log.generateLogFromDataSets(dataSets, user, {
                action,
                status,
            });
            return this.logRepository.save([log]);
        });
    }

    checkDataSetAccess(dataSets: DataSet[]): FutureData<void> {
        return this.getCurrentUser().flatMap(user => {
            const hasAccess = dataSets.every(dataSet => {
                return dataSet.hasPermissionsToUpdate(user);
            });

            return hasAccess
                ? Future.void()
                : Future.error(
                      new Error(i18n.t("User does not have access to update the data sets"))
                  );
        });
    }
}

export function throwUserNotAdminError<T>(): FutureData<T> {
    return Future.error(new Error(i18n.t("User is not an admin")));
}
