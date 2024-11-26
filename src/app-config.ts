export const appConfig: AppConfig = {
    id: "d2-dataset-configuration",
    appearance: { showShareButton: true },
};

export interface AppConfig {
    id: string;
    appearance: { showShareButton: boolean };
}
