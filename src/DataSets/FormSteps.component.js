import React from "react";
import createReactClass from "create-react-class";
import _ from "lodash";
import Translate from "d2-ui/lib/i18n/Translate.mixin";
import Wizard from "../Wizard/Wizard.component";
import { goToRoute } from "../router";
import InitialConfig from "./Forms/InitialConfig.component";
import GeneralInformation from "./Forms/GeneralInformation.component";
import OrganisationUnit from "./Forms/OrganisationUnit.component";
import CoreSections from "./Forms/CoreSections.component";
import NonCoreSections from "./Forms/NonCoreSections.component";
import Disaggregation from "./Forms/Disaggregation.component";
import Sharing from "./Forms/Sharing.component";
import GreyFields from "./Forms/GreyFields.component";
import Save from "./Forms/Save.component";
import snackActions from "../Snackbar/snack.actions";
import LoadingMask from "../LoadingMask/LoadingMask.component";
import Heading from "d2-ui/lib/headings/Heading.component";
import DataSetStore from "../models/DataSetStore";
import Settings from "../models/Settings";

const DataSetFormSteps = createReactClass({
    mixins: [Translate],
    propTypes: {},

    getInitialState() {
        return {
            store: null,
            active: 0,
            doneUntil: 0,
            validating: false,
            saving: false,
        };
    },

    componentDidMount() {
        const { d2 } = this.context;
        const settings = new Settings(d2);
        const { action, id: datasetId } = this.props;

        const getStore = config => {
            if (action === "add") {
                return DataSetStore.add(d2, config);
            } else if (action === "edit") {
                return DataSetStore.edit(d2, config, datasetId);
            } else if (action === "clone") {
                return DataSetStore.clone(d2, config, datasetId);
            } else {
                throw new Error(`Unknown action: ${action}`);
            }
        };

        settings
            .get()
            .then(config => {
                return getStore(config)
                    .then(store => this.setState({ store }))
                    .catch(err => {
                        console.error(err);
                        snackActions.show({
                            route: "/",
                            message: `Cannot edit dataset: ${err.message || JSON.stringify(err)}`,
                        });
                    });
            })
            .catch(err => {
                snackActions.show({ route: "/", message: `Error: settings not found: ${err}` });
            });
    },

    _onFieldsChange(stepId, fieldPath, newValue, update = true) {
        this.state.store.updateField(fieldPath, newValue);
        if (update) {
            this.forceUpdate();
        }
    },

    _afterSave() {
        goToRoute("/");
    },

    _onCancel() {
        if (window.confirm(this.getTranslation("confirm_wizard_cancel"))) {
            goToRoute("/");
        }
    },

    _onStepChange(newIndex) {
        if (newIndex > this.state.active) {
            this.setState({ stepAfterValidation: newIndex });
        } else {
            this.setState({ active: newIndex, doneUntil: newIndex });
        }
    },

    _showButtonFunc(step) {
        return step.id === "save";
    },

    _formStatus(isValid) {
        const newIndex = this.state.stepAfterValidation;

        if (isValid && newIndex) {
            this.setState({ stepAfterValidation: null, active: newIndex, doneUntil: newIndex });
        } else {
            this.setState({ stepAfterValidation: null });
        }
    },

    render() {
        const { store } = this.state;
        if (!store) return <LoadingMask />;

        const props = {
            config: store.config,
            store: store,
            validateOnRender: !!this.state.stepAfterValidation,
            formStatus: this._formStatus,
        };

        const buttons = [
            {
                id: "cancel",
                label: this.getTranslation("cancel"),
                onClick: this._onCancel,
            },
            {
                id: "save",
                label: this.getTranslation("save"),
                onClick: () => this.setState({ saving: true }),
                showFunc: this._showButtonFunc,
            },
        ];

        const steps = [
            {
                id: "initialConfig",
                title: this.getTranslation("step_initial_configuration"),
                component: InitialConfig,
                props: props,
                help: this.getTranslation("help_initial_configuration"),
            },
            {
                id: "generalInformation",
                title: this.getTranslation("step_general_information"),
                component: GeneralInformation,
                props: props,
                help: this.getTranslation("help_general_information"),
            },
            {
                id: "organisationUnit",
                title: this.getTranslation("organisation_unit"),
                component: OrganisationUnit,
                props: props,
                help: this.getTranslation("help_organisation_unit"),
            },
            {
                id: "sections",
                title: this.getTranslation("step_core_indicators"),
                component: CoreSections,
                props: props,
                help: this.getTranslation("help_core_indicators"),
            },
            {
                id: "sections",
                title: this.getTranslation("step_non_core_indicators"),
                component: NonCoreSections,
                props: props,
                help: this.getTranslation("help_non_core_indicators"),
            },
            {
                id: "disaggregation",
                title: this.getTranslation("step_disaggregation"),
                component: Disaggregation,
                props: props,
                help: this.getTranslation("help_disaggregation"),
            },
            {
                id: "grey_fields",
                title: this.getTranslation("step_grey_fields"),
                component: GreyFields,
                props: props,
                help: this.getTranslation("help_grey_fields"),
            },
            {
                id: "sharing",
                title: this.getTranslation("step_sharing"),
                component: Sharing,
                visible: store.isSharingStepVisible(),
                props: props,
                help: this.getTranslation("help_sharing"),
            },
            {
                id: "save",
                title: this.getTranslation("save"),
                component: Save,
                props: _.merge(props, { saving: this.state.saving, afterSave: this._afterSave }),
                help: this.getTranslation("help_save"),
            },
        ].filter(step => !step.disabled);

        const { dataset } = this.state.store;
        const actionTitle = this.getTranslation("action_" + this.props.action, {
            title: dataset.name || "-",
            sourceTitle: dataset._sourceName || "-",
        });

        return (
            <div>
                <Heading style={{ fontSize: 18 }}>{actionTitle}</Heading>

                <Wizard
                    steps={steps}
                    onFieldsChange={this._onFieldsChange}
                    onStepChange={this._onStepChange}
                    active={this.state.active}
                    doneUntil={this.state.doneUntil}
                    buttons={buttons}
                />
            </div>
        );
    },
});

export default DataSetFormSteps;
