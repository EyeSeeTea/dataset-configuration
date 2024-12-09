import i18n from "$/utils/i18n";
import { IndicatorsDataSet } from "$/webapp/components/dataset-wizard/IndicatorsDataSet";
import { SetupDataSet } from "$/webapp/components/dataset-wizard/SetupDataSet";
import { ShareOptionsDataSet } from "$/webapp/components/dataset-wizard/ShareOptionsDataSet";
import { SummaryDataSet } from "$/webapp/components/dataset-wizard/SummaryDataSet";

export function getDataSetSteps() {
    const steps = [
        {
            component: SetupDataSet,
            label: i18n.t("Setup"),
            key: "setup",
        },
        {
            component: IndicatorsDataSet,
            label: i18n.t("Indicators"),
            key: "indicators",
        },
        {
            component: ShareOptionsDataSet,
            label: i18n.t("Share"),
            key: "share",
        },
        {
            component: SummaryDataSet,
            label: i18n.t("Summary and Save"),
            key: "summary",
        },
    ];

    return steps;
}
