import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import fp from "lodash/fp";
import _ from "lodash";
import Translate from "d2-ui/lib/i18n/Translate.mixin";
import Validators from "d2-ui/lib/forms/Validators";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";

import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import LinearProgress from "material-ui/LinearProgress/LinearProgress";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import Card from "material-ui/Card/Card";
import CardText from "material-ui/Card/CardText";
import { Tabs, Tab } from "material-ui/Tabs";

import Settings from "../models/Settings";
import FormHelpers from "../forms/FormHelpers";
import ObservedEvents from "../utils/ObservedEvents.mixin";
import YearlyDateSelector from "../forms/YearlyDateSelector.component";
import TimePeriodSelector from "../forms/TimePeriodSelector.component";

const TabCard = ({ fields, onUpdateFormStatus, onUpdateField }) => (
    <Card style={{ padding: 10, margin: 10 }}>
        <CardText>
            <FormBuilder
                fields={fields}
                validateOnRender={false}
                onUpdateFormStatus={onUpdateFormStatus}
                onUpdateField={onUpdateField}
            />
        </CardText>
    </Card>
);

const SettingsDialog = createReactClass({
    propTypes: {
        open: PropTypes.bool.isRequired,
        onRequestClose: PropTypes.func.isRequired,
    },

    mixins: [ObservedEvents, Translate],

    tabs: {
        general: [
            "categoryProjectsId",
            "categoryComboId",
            "dataElementGroupSetCoreCompetencyId",
            "expiryDays",
            "outputEndDate",
            "outcomeEndDate",
            "outputLastYearEndDate",
            "outcomeLastYearEndDate",
            "organisationUnitLevelForCountriesId",
            "createdByDataSetConfigurationAttributeId",
            "dataPeriodOutputDatesAttributeId",
            "dataPeriodOutcomeDatesAttributeId",
            "dataPeriodIntervalDatesAttributeId",
        ],
        sections: {
            partition: [
                "dataElementGroupSetThemeId",
                "indicatorGroupSetThemeId",
                "attributeGroupId",
            ],
            other: [
                "dataElementGroupOutputId",
                "dataElementGroupGlobalIndicatorMandatoryId",
                "indicatorGroupGlobalIndicatorMandatoryId",
                "dataElementGroupSetOriginId",
                "indicatorGroupSetOriginId",
                "dataElementGroupSetStatusId",
                "indicatorGroupSetStatusId",
                "hideInDataSetAppAttributeId",
                "exclusionRuleCoreUserGroupId",
            ],
        },
    },

    getInitialState() {
        this.settings = new Settings(this.context.d2);
        return { loaded: false };
    },

    UNSAFE_componentWillReceiveProps(newProps) {
        if (newProps.open) {
            this.loadConfig();
        }
    },

    loadConfig() {
        Promise.all([this.settings.get(), this.settings.getFields()]).then(([config, fields]) => {
            this.setState({
                loaded: true,
                fields: fields,
                config: config,
                currentTab: "general",
                formStatuses: {},
            });
        });
    },

    save() {
        this.settings.save(this.state.config).then(() => this.props.onRequestClose());
    },

    onUpdateField(key, value) {
        const newState = fp.set(["config", key], value, this.state);
        this.setState(newState);
    },

    getFields(key) {
        const { fields, config } = this.state;
        const keys = _.get(this.tabs, key);
        const tabFields = _(fields)
            .keyBy("name")
            .at(keys)
            .value();

        return tabFields.map(field => {
            if (field.type === "yearlyDate") {
                return {
                    name: field.name,
                    component: YearlyDateSelector,
                    value: config[field.name],
                    props: {
                        labelText: this.getTranslation(field.i18n_key),
                    },
                };
            } else if (field.type === "timePeriod") {
                return {
                    name: field.name,
                    component: TimePeriodSelector,
                    value: config[field.name],
                    props: {
                        labelText: this.getTranslation(field.i18n_key),
                    },
                };
            } else if (field.options) {
                return FormHelpers.getSelectField({
                    name: field.name,
                    label: this.getTranslation(field.i18n_key),
                    isRequired: false,
                    options: field.options,
                    value: config[field.name],
                });
            } else {
                return FormHelpers.getTextField({
                    name: field.name,
                    label: this.getTranslation(field.i18n_key),
                    isRequired: true,
                    value: config[field.name],
                    validators: [
                        {
                            validator: Validators.isRequired,
                            message: this.getTranslation(Validators.isRequired.message),
                        },
                    ],
                });
            }
        });
    },

    onChangeTab(value) {
        this.setState({ currentTab: value });
    },

    onUpdateFormStatus(section, status) {
        const newFormStatuses = _(_.clone(this.state.formStatuses))
            .set(section, status.valid)
            .value();
        this.setState({ formStatuses: newFormStatuses });
    },

    render() {
        const { loaded, formStatuses } = this.state;
        const saveIsEnabled =
            loaded &&
            _(formStatuses)
                .values()
                .every();

        const actions = [
            <FlatButton
                label={this.getTranslation("cancel")}
                onClick={this.props.onRequestClose}
                style={{ marginRight: 16 }}
            />,
            loaded ? (
                <RaisedButton
                    primary
                    label={this.getTranslation("save")}
                    disabled={!saveIsEnabled}
                    onClick={this.save}
                />
            ) : null,
        ];

        const getTabCardProps = section => ({
            fields: this.getFields(section),
            onUpdateFormStatus: status => _.defer(this.onUpdateFormStatus, section, status),
            onUpdateField: this.onUpdateField,
        });

        return (
            <Dialog
                autoScrollBodyContent
                autoDetectWindowHeight
                repositionOnUpdate
                title={this.getTranslation("settings")}
                style={{ maxWidth: "none" }}
                contentStyle={{ maxWidth: "none" }}
                open={this.props.open}
                onRequestClose={this.props.onRequestClose}
                actions={_.compact(actions)}
            >
                {!loaded ? (
                    <LinearProgress />
                ) : (
                    <Tabs
                        style={{ paddingTop: 10 }}
                        value={this.state.currentTab}
                        onChange={this.onChangeTab}
                    >
                        <Tab value="general" label={this.getTranslation("config_tab_general")}>
                            <TabCard {...getTabCardProps("general")} />
                        </Tab>

                        <Tab value="sections" label={this.getTranslation("config_tab_sections")}>
                            <TabCard {...getTabCardProps("sections.partition")} />
                            <TabCard {...getTabCardProps("sections.other")} />
                        </Tab>
                    </Tabs>
                )}
            </Dialog>
        );
    },
});

export default SettingsDialog;
