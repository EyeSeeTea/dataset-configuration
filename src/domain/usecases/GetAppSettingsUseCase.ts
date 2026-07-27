import { AppSettings } from "$/domain/entities/AppSettings";
import { User } from "$/domain/entities/User";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";
import { throwUserNotAdminError } from "$/domain/usecases/common/UserUtils";

export class GetAppSettingsUseCase {
    constructor(private appSettingsRepository: AppSettingsRepository) {}

    execute(user: User): FutureData<AppSettings> {
        return user.isAdmin() ? this.appSettingsRepository.get() : throwUserNotAdminError();
    }
}
