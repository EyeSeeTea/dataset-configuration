import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";

export interface AppSettingsRepository {
    get(): FutureData<AppSettings>;
    save(appSettings: AppSettings): FutureData<void>;
}
