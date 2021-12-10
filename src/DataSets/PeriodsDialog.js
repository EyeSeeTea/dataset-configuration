import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import DataSetPeriods from "./DataSetPeriods";
import LinearProgress from "material-ui/LinearProgress/LinearProgress";
import snackActions from "../Snackbar/snack.actions";
import {
    getDataSetsForPeriods,
    getDataSetsForPeriodsEndDate,
    saveDataSets,
    saveDataSetsEndDate,
} from "../models/data-periods";

export default class PeriodsDialog extends React.Component {
    static propTypes = {
        onRequestClose: PropTypes.func.isRequired,
        endYear: PropTypes.number,
    };

    static contextTypes = {
        d2: PropTypes.any,
    };

    state = {
        saving: false,
        dataSets: null,
        store: null,
        warning: null,
        error: null,
    };

    styles = {
        warning: { color: "red", marginBottom: -10 },
        error: { fontSize: "0.8em" },
        noMaxWidth: { maxWidth: "none" },
    };

    constructor(props, context) {
        super(props);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);

        const { endYear } = props;
        this.getDataSetsForPeriods = endYear ? getDataSetsForPeriodsEndDate : getDataSetsForPeriods;
        this.saveDataSets = endYear ? saveDataSetsEndDate : saveDataSets;
    }

    async componentDidMount() {
        const { dataSets, store, warning, error } = await this.getDataSetsForPeriods(
            this.context.d2,
            this.props.dataSets.map(ds => ds.id),
            this.props.endYear
        ).catch(err => ({ error: err.message }));

        if (error) {
            snackActions.show({ message: error });
            this.props.onRequestClose();
        } else {
            this.setState({ dataSets, store, warning });
        }
    }

    getActions() {
        const { onRequestClose } = this.props;
        const { saving } = this.state;

        return [
            <FlatButton
                label={this.getTranslation("cancel")}
                onClick={onRequestClose}
                style={{ marginRight: 16 }}
            />,
            <RaisedButton
                primary
                label={this.getTranslation("save")}
                disabled={saving}
                onClick={this.save}
            />,
        ];
    }

    save = async () => {
        const { d2 } = this.context;
        const { onRequestClose, endYear } = this.props;
        const { store, dataSets } = this.state;
        this.setState({ saving: true, error: null });

        try {
            const response = _.first(await this.saveDataSets(d2, store, dataSets, endYear));
            if (response && response.status === "OK") {
                onRequestClose();
                snackActions.show({ message: this.getTranslation("dataset_saved") });
            } else {
                this.setState({ error: JSON.stringify(response, null, 2) });
            }
        } catch (err) {
            console.error(err);
            this.setState({ error: (err && err.message) || "Error" });
        } finally {
            this.setState({ saving: false });
        }
    };

    onUpdateField = (fieldPath, newValue) => {
        this.state.store.updateField(fieldPath, newValue);
        this.forceUpdate();
    };

    render() {
        const { onRequestClose, endYear } = this.props;
        const { saving, dataSets, store, warning, error } = this.state;
        const actions = this.getActions();

        if (!store) return <LinearProgress />;

        const title = this.getTranslation("period_dates") + ": " + this.getNames(dataSets);

        return (
            <Dialog
                autoScrollBodyContent
                autoDetectWindowHeight
                repositionOnUpdate
                title={title}
                style={this.styles.noMaxWidth}
                contentStyle={this.styles.noMaxWidth}
                open={true}
                onRequestClose={onRequestClose}
                actions={actions}
            >
                {saving && <LinearProgress />}
                {warning && <p style={this.styles.warning}> {warning}</p>}
                {error && <pre style={this.styles.error}>{error}</pre>}

                <DataSetPeriods
                    store={store}
                    onFieldChange={this.onUpdateField}
                    endYear={endYear}
                />
            </Dialog>
        );
    }

    getNames(dataSets) {
        const maxShown = 5;
        const remanining = dataSets.length - maxShown;

        const baseNames = _(dataSets)
            .take(maxShown)
            .map(ds => ds.displayName)
            .join(", ");

        return remanining > 0
            ? this.getTranslation("this_and_n_others", { this: baseNames, n: remanining })
            : baseNames;
    }
}
