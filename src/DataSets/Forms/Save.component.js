import React from 'react';
import Translate from 'd2-ui/lib/i18n/Translate.mixin';
import LinearProgress from 'material-ui/LinearProgress/LinearProgress';
import Card from 'material-ui/Card/Card';
import CardText from 'material-ui/Card/CardText';
import snackActions from '../../Snackbar/snack.actions';
import {collectionToArray} from '../../utils/Dhis2Helpers';

const Save = React.createClass({
    mixins: [Translate],

    propTypes: {
        config: React.PropTypes.object,
        store: React.PropTypes.object,
        state: React.PropTypes.string,
        errors: React.PropTypes.arrayOf(React.PropTypes.string),
        afterSave: React.PropTypes.func.isRequired,
    },

    saveStates: {
        SHOW: "SHOW",
        SAVING: "SAVING",
        SAVE_ERROR: "SAVE_ERROR",
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.saving) {
            this._save();
        }
    },

    getInitialState() {
        return {saveState: this.saveStates.SHOW, errors: []};
    },

    _redirectAfterSave() {
        snackActions.show({message: 'dataset_saved', action: 'ok', translate: true});
        this.props.afterSave();
    },

    _saveErrors(error) {
        console.trace(error);
        const message = _.isEmpty(error) ? error.toString() : JSON.stringify(error, null, 2);
        this.setState({saveState: this.saveStates.SAVE_ERROR, errors: [message]})
    },

    _save() {
        this.setState({saveState: this.saveStates.SAVING});
        this.props.store
            .save()
            .then(this._redirectAfterSave)
            .catch(this._saveErrors);
    },

    render() {
        const {dataset, associations} = this.props.store;
        const {saveState, errors} = this.state;
        const ListItem = ({field, value}) => {
            return (
                <li className="list-group-item">
                    <label style={{fontWeight: 'bold', marginRight: 5}}>
                        {this.getTranslation(field)}:
                    </label>
                    <span>{value || '-'}</span>
                </li>
            );
        };

        if (saveState === this.saveStates.SHOW || saveState === this.saveStates.SAVING) {
            return (
                <div style={{fontSize: '1.2em', marginTop: 10}}>
                    {saveState === "SAVING" ? <LinearProgress /> : null}

                    <div>{this.getTranslation("wizard_presave_message")}</div>

                    <ul className="list-group">
                        <ListItem field="name"
                            value={dataset.name} />
                        <ListItem field="description"
                            value={dataset.description} />
                        <ListItem field="core_competencies"
                            value={associations.coreCompetencies.map(cc => cc.name).join(", ")} />
                        <ListItem field="linked_project"
                            value={associations.project && associations.project.name} />
                        <ListItem field="orgunits_settings"
                            value={collectionToArray(dataset.organisationUnits || []).map(c => c.displayName).join(", ")} />
                        <ListItem field="countries"
                            value={(associations.countries || []).map(c => c.displayName).join(", ")} />
                    </ul>
                </div>
            );
        } else if (saveState === this.saveStates.SAVE_ERROR) {
            return (
                <div className="alert alert-danger">
                    <div>{this.getTranslation("wizard_save_error_message")}</div>
                    {errors.map((error, idx) => <pre key={idx}>{error}</pre>)}
                </div>
            );
        }
    },
});

export default Save;