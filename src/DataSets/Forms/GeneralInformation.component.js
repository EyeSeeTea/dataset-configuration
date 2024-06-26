import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import _ from "lodash";
import Translate from "d2-ui/lib/i18n/Translate.mixin";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";
import Validators from "d2-ui/lib/forms/Validators";
import LinearProgress from "material-ui/LinearProgress/LinearProgress";
import FormHelpers from "../../forms/FormHelpers";
import { currentUserHasAdminRole, getAsyncUniqueValidator } from "../../utils/Dhis2Helpers";
import DataSetPeriods from "../DataSetPeriods";
import snackActions from "../../Snackbar/snack.actions";
import { getPeriodsValidationsErrors } from "../../models/data-periods";

const GeneralInformation = createReactClass({
    mixins: [Translate],

    styles: {
        error: { color: "red" },
    },

    propTypes: {
        config: PropTypes.object,
        store: PropTypes.object,
        onFieldsChange: PropTypes.func,
        validateOnRender: PropTypes.bool,
    },

    getInitialState() {
        return {
            error: null,
            isLoading: true,
            currentUserHasAdminRole: currentUserHasAdminRole(this.context.d2),
            isValid: undefined,
        };
    },

    componentDidMount() {
        this.context.d2.models.categoryCombos
            .list({
                filter: ["dataDimensionType:eq:ATTRIBUTE", "name:eq:default"],
                fields: "id,name",
                paging: false,
                rootJunction: "OR",
            })
            .then(collection => collection.toArray())
            .then(categoryCombinations =>
                this.setState({
                    isLoading: false,
                    categoryCombinations,
                })
            );
    },

    async _validateNameUniqueness(name) {
        const { dataset } = this.props.store;
        const dataSets = await this.context.d2.models.dataSets.list({
            fields: "id,name",
            filter: "name:$ilike:" + name,
        });
        const existsDataSetWithName = dataSets
            .toArray()
            .some(ds => ds.id !== dataset.id && ds.name.toLowerCase() === name.toLowerCase());

        if (existsDataSetWithName) {
            throw this.getTranslation("dataset_name_exists");
        } else {
            this.setState({ error: null });
        }
    },

    _renderForm() {
        const { store } = this.props;
        const { dataset } = store;
        const { error } = this.state;

        const fields = _.compact([
            FormHelpers.getTextField({
                name: "dataset.name",
                label: this.getTranslation("name"),
                value: dataset.name,
                isRequired: true,
                validators: [
                    {
                        validator: Validators.isRequired,
                        message: this.getTranslation(Validators.isRequired.message),
                    },
                ],
                asyncValidators: [name => this._validateNameUniqueness(name)],
            }),

            FormHelpers.getTextField({
                name: "dataset.description",
                label: this.getTranslation("description"),
                value: dataset.description,
                multiLine: true,
            }),

            this.state.currentUserHasAdminRole &&
                FormHelpers.getTextField({
                    name: "dataset.expiryDays",
                    label: this.getTranslation("expiry_days"),
                    help: this.getTranslation("expiry_days_help"),
                    value: dataset.expiryDays,
                    type: "number",
                }),

            this.state.currentUserHasAdminRole &&
                FormHelpers.getTextField({
                    name: "dataset.openFuturePeriods",
                    label: this.getTranslation("open_future_periods"),
                    value: dataset.openFuturePeriods,
                    type: "number",
                }),

            FormHelpers.getBooleanField({
                name: "dataset.notifyCompletingUser",
                label: this.getTranslation("notify_completing_user"),
                value: dataset.notifyCompletingUser,
                onChange: this._onUpdateField,
            }),
        ]);

        return (
            <div>
                {error && <p style={this.styles.error}>{error}</p>}

                <FormBuilder
                    fields={_.compact(fields)}
                    onUpdateField={this._onUpdateField}
                    onUpdateFormStatus={this._onUpdateFormStatus}
                    validateOnRender={_.isUndefined(this.state.isValid)}
                />

                <DataSetPeriods store={store} onFieldChange={this._onUpdateField} />
            </div>
        );
    },

    _onUpdateField(fieldPath, newValue) {
        this.props.onFieldsChange(fieldPath, newValue);
    },

    async getErrorMessage() {
        const periodsErrors = getPeriodsValidationsErrors(this.props.store, {
            validateOutputOutcome: this.state.currentUserHasAdminRole,
        });

        const { dataset } = this.props.store;
        const shortName = dataset.name.slice(0, 50);
        const validateShortName = getAsyncUniqueValidator(
            this.context.d2.models.dataSet,
            "shortName",
            dataset.id
        );
        const shortNameError = await validateShortName(shortName)
            .then(() => undefined)
            .catch(() => `Data set shortName already exists: ${shortName}`);

        const messages = [shortNameError, ...periodsErrors];

        return messages.join("\n");
    },

    async _onUpdateFormStatus(status) {
        const statusIsValid = Boolean(!status.validating && status.valid);
        const message = await this.getErrorMessage();
        const isValid = statusIsValid && !message;

        this.setState({ isValid: statusIsValid });
        this.props.formStatus(isValid);
    },

    async UNSAFE_componentWillReceiveProps(props) {
        if (!props.validateOnRender) return;

        const message = await this.getErrorMessage();
        const isValid = Boolean(!message);

        if (message) snackActions.show({ message });
        this.props.formStatus(isValid);
    },

    render() {
        if (this.state.isLoading) {
            return <LinearProgress />;
        } else {
            return this._renderForm();
        }
    },
});

export default GeneralInformation;
