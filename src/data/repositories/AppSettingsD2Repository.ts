import { D2Api } from "$/types/d2-api";
import { D2ApiAppSettings } from "$/data/repositories/D2ApiAppSettings";
import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";

export class AppSettingsD2Repository implements AppSettingsRepository {
    private d2ApiAppSettings: D2ApiAppSettings;
    constructor(private api: D2Api) {
        this.d2ApiAppSettings = new D2ApiAppSettings(this.api);
    }

    get(): FutureData<AppSettings> {
        return this.d2ApiAppSettings.get();
    }

    save(appSettings: AppSettings): FutureData<void> {
        return this.d2ApiAppSettings.save(appSettings);
    }
}
