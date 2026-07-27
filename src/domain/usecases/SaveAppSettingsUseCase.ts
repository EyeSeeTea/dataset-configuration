import { AppSettings } from "$/domain/entities/AppSettings";
import { User } from "$/domain/entities/User";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";
import { throwUserNotAdminError } from "$/domain/usecases/common/UserUtils";

export class SaveAppSettingsUseCase {
    constructor(private appSettingsRepository: AppSettingsRepository) {}

    execute(settings: AppSettings, user: User): FutureData<void> {
        return user.isAdmin()
            ? this.appSettingsRepository.save(settings)
            : throwUserNotAdminError();
    }
}
