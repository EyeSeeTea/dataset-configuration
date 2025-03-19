import React from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Paper,
    Tab,
    Tabs,
    TextField,
} from "@material-ui/core";

import i18n from "$/utils/i18n";
import { ModalSelector } from "$/webapp/components/modal-selector/ModalSelector";
import { Maybe } from "$/utils/ts-utils";
import { Dropdown, useSnackbar } from "@eyeseetea/d2-ui-components";
import styled from "styled-components";
import { getDaysPerMonthYear, getMonths, getUnits } from "$/utils/date";
import { useAppContext } from "$/webapp/contexts/app-context";
import { AppSettings } from "$/domain/entities/AppSettings";
import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { useCallbackEffect } from "$/webapp/hooks/useCallbackEffect";

type SettingsFormProps = { onClose: () => void };

const tabsValues = [
    {
        value: "general",
        label: i18n.t("General"),
    },
    {
        value: "sections",
        label: i18n.t("Sections"),
    },
] as const;
type SelectedTab = (typeof tabsValues)[number]["value"];

export const SettingsForm = React.memo((props: SettingsFormProps) => {
    const { onClose } = props;
    const { compositionRoot, currentUser } = useAppContext();
    const [settingsData, setSettingsData] = React.useState<AppSettingsData>();
    const [appSettings, setAppSettings] = React.useState<AppSettings>();
    const [selectedTab, setSelectedTab] = React.useState<SelectedTab>("general");
    const [loading, setLoading] = React.useState(false);
    const snackbar = useSnackbar();

    React.useEffect(() => {
        return compositionRoot.appSettings.get
            .execute(currentUser)
            .run(setAppSettings, console.error);
    }, [compositionRoot.appSettings.get, currentUser]);

    React.useEffect(() => {
        return compositionRoot.appSettings.getData
            .execute(currentUser)
            .run(setSettingsData, console.error);
    }, [compositionRoot.appSettings.getData, currentUser]);

    const changeTab = (value: SelectedTab) => {
        setSelectedTab(value);
    };

    const updateSettings = (settings: AppSettings) => {
        setAppSettings(settings);
    };

    const saveSettings = useCallbackEffect(
        React.useCallback(() => {
            if (!appSettings) return;
            setLoading(true);
            return compositionRoot.appSettings.save.execute(appSettings, currentUser).run(
                () => {
                    snackbar.success(i18n.t("Settings saved"));
                    onClose();
                    setLoading(false);
                },
                () => {
                    setLoading(false);
                }
            );
        }, [appSettings, compositionRoot.appSettings.save, currentUser, onClose, snackbar])
    );

    const TabsComponents = { general: GeneralForm, sections: SectionForm };
    const CurrentTab = TabsComponents[selectedTab];

    return (
        <Dialog open maxWidth="md" fullWidth>
            <DialogTitle>{i18n.t("Configuration settings")}</DialogTitle>

            <DialogContent>
                <Tabs
                    value={selectedTab}
                    onChange={(_event, value) => changeTab(value)}
                    className="settings-tabs"
                >
                    {tabsValues.map(tab => (
                        <Tab key={tab.value} value={tab.value} label={tab.label} fullWidth />
                    ))}
                </Tabs>
                {appSettings && settingsData ? (
                    <form>
                        <CurrentTab
                            onChange={updateSettings}
                            appSettings={appSettings}
                            settingsData={settingsData}
                        />
                    </form>
                ) : (
                    <LoadingContainer>
                        <LinearProgress />
                    </LoadingContainer>
                )}
            </DialogContent>

            <DialogActions>
                <Button type="submit" variant="contained" onClick={() => onClose()}>
                    {i18n.t("Cancel")}
                </Button>

                <Button
                    disabled={loading}
                    color="primary"
                    onClick={saveSettings}
                    variant="contained"
                    type="submit"
                >
                    {i18n.t("Save")}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

type GeneralFormProps = {
    appSettings: AppSettings;
    onChange: (appSettings: AppSettings) => void;
    settingsData: AppSettingsData;
};

const GeneralForm = (props: GeneralFormProps) => {
    const { appSettings, onChange, settingsData } = props;

    const updateProject = (item: Maybe<string | number>, field: keyof AppSettings) => {
        onChange(AppSettings.create({ ...appSettings, [field]: item }));
    };

    const monthsItems = getMonths();
    const unitsItems = getUnits();
    const daysPerMonthYear = getDaysPerMonthYear(appSettings.periodEndDateMonth);

    return (
        <GeneralFormContainer>
            <ModalSelector
                items={settingsData.categories}
                value={appSettings.defaultProjectId}
                onChange={item => updateProject(item?.value, "defaultProjectId")}
                showEmptyValue
                label={i18n.t("Projects Category")}
            />

            <ModalSelector
                items={settingsData.combinations}
                value={appSettings.categoryComboId}
                onChange={item => updateProject(item?.value, "categoryComboId")}
                showEmptyValue
                label={i18n.t("Category combination")}
            />

            <ModalSelector
                items={settingsData.dataElementsGroupSets}
                value={appSettings.coreCompetencyId}
                onChange={item => updateProject(item?.value, "coreCompetencyId")}
                showEmptyValue
                label={i18n.t("Core competency data element group set")}
            />

            <Box display="flex">
                <Box flex="1">
                    <Dropdown
                        className="dropdown dropdown-resetmargins"
                        hideEmpty
                        items={monthsItems}
                        label={i18n.t("Default Period End Date - Month")}
                        onChange={value => updateProject(Number(value), "periodEndDateMonth")}
                        value={String(appSettings.periodEndDateMonth)}
                    />
                </Box>
                <Dropdown
                    hideEmpty
                    items={daysPerMonthYear}
                    onChange={value => updateProject(Number(value), "periodEndDateDay")}
                    label={i18n.t("Day")}
                    value={String(appSettings.periodEndDateDay)}
                />
            </Box>
            <Box display="flex">
                <Box flex="1">
                    <TextField
                        fullWidth
                        label={i18n.t("Default Time Period End Date (Last year) - Value")}
                        type="number"
                        value={appSettings.periodLastYearEndDate}
                        onChange={event =>
                            updateProject(Number(event.target.value), "periodLastYearEndDate")
                        }
                    />
                </Box>
                <Dropdown
                    hideEmpty
                    items={unitsItems}
                    onChange={value => updateProject(value, "periodLastYearUnits")}
                    label={i18n.t("Units")}
                    value={appSettings.periodLastYearUnits}
                />
            </Box>
            <Dropdown
                items={settingsData.countriesLevel}
                onChange={value => updateProject(value, "countryLevelId")}
                className="dropdown-resetmargins"
                label={i18n.t("Country organisation unit level")}
                value={appSettings.countryLevelId}
            />

            <Dropdown
                items={settingsData.fields}
                onChange={value => updateProject(value, "dataSetFilterField")}
                className="dropdown-resetmargins"
                label={i18n.t("Created by dataSet Configuration attribute")}
                value={appSettings.dataSetFilterField}
            />

            <Dropdown
                items={settingsData.fields}
                className="dropdown-resetmargins"
                label={i18n.t("Attribute for Period Dates")}
                onChange={value => updateProject(value, "periodDateField")}
                value={appSettings.periodDateField}
            />

            <Dropdown
                items={settingsData.fields}
                onChange={value => updateProject(value, "inputDateField")}
                className="dropdown-resetmargins"
                label={i18n.t("Attribute for interval dates")}
                value={appSettings.inputDateField}
            />
        </GeneralFormContainer>
    );
};

const SectionForm = (props: GeneralFormProps) => {
    const { appSettings, onChange, settingsData } = props;

    const updateProject = (item: Maybe<string | number>, field: keyof AppSettings) => {
        onChange(AppSettings.create({ ...appSettings, [field]: item }));
    };

    return (
        <section className="section-container">
            <Paper elevation={3} className="setting-form-section">
                <Dropdown
                    items={settingsData.dataElementsGroupSets}
                    onChange={value => updateProject(value, "dataElementThemeId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Data element theme group set")}
                    value={appSettings.dataElementThemeId}
                />

                <Dropdown
                    items={settingsData.indicatorsGroupSets}
                    onChange={value => updateProject(value, "indicatorThemeId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Indicator theme group set")}
                    value={appSettings.indicatorThemeId}
                />

                <Dropdown
                    items={settingsData.fields}
                    onChange={value => updateProject(value, "groupField")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Group attribute")}
                    value={appSettings.groupField}
                />
            </Paper>
            <Paper elevation={3} className="setting-form-section">
                <ModalSelector
                    items={settingsData.dataElementsGroups}
                    value={appSettings.outputId}
                    onChange={item => updateProject(item?.value, "outputId")}
                    showEmptyValue
                    label={i18n.t("Output data element group")}
                />

                <ModalSelector
                    items={settingsData.dataElementsGroups}
                    value={appSettings.mandatoryDataElementId}
                    onChange={item => updateProject(item?.value, "mandatoryDataElementId")}
                    showEmptyValue
                    label={i18n.t("Global indicators mandatory data element group set")}
                />

                <ModalSelector
                    items={settingsData.indicatorsGroups}
                    value={appSettings.mandatoryIndicatorId}
                    onChange={item => updateProject(item?.value, "mandatoryIndicatorId")}
                    showEmptyValue
                    label={i18n.t("Global indicators mandatory indicator group set")}
                />

                <Dropdown
                    items={settingsData.dataElementsGroupSets}
                    onChange={value => updateProject(value, "originDataElementId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Data Element origin group set")}
                    value={appSettings.originDataElementId}
                />

                <Dropdown
                    items={settingsData.indicatorsGroupSets}
                    onChange={value => updateProject(value, "originIndicatorId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Indicator origin group set")}
                    value={appSettings.originIndicatorId}
                />

                <Dropdown
                    items={settingsData.dataElementsGroupSets}
                    onChange={value => updateProject(value, "statusDataElementId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Data Element status group set")}
                    value={appSettings.statusDataElementId}
                />

                <Dropdown
                    items={settingsData.indicatorsGroupSets}
                    onChange={value => updateProject(value, "statusIndicatorId")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Indicator status group set")}
                    value={appSettings.statusIndicatorId}
                />

                <Dropdown
                    items={settingsData.fields}
                    onChange={value => updateProject(value, "indicatorHideField")}
                    className="dropdown-resetmargins"
                    label={i18n.t("Hide in dataset attribute")}
                    value={appSettings.indicatorHideField}
                />

                <ModalSelector
                    items={settingsData.userGroups}
                    value={appSettings.userGroupId}
                    onChange={item => updateProject(item?.value, "userGroupId")}
                    showEmptyValue
                    label={i18n.t("User group excluded of selecting core items")}
                />
            </Paper>
        </section>
    );
};

const GeneralFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1em;
    padding-block: 1em;
`;

const LoadingContainer = styled.div`
    padding-block: 1em;
`;
