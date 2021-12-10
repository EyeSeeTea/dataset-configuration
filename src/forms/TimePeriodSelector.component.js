import React from "react";
import PropTypes from "prop-types";
import SelectField from "material-ui/SelectField/SelectField";
import TextField from "material-ui/TextField";
import MenuItem from "material-ui/MenuItem/MenuItem";

class TimePeriodSelector extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.unitsOptions = this.getUnitsOptions();
    }

    onUnitChange = (event, index, value) => {
        const newValue = { ...this.props.value, units: value };
        this.notifyChange(newValue);
    };

    onValueChange = (event, value) => {
        const newValue = { ...this.props.value, value: parseInt(value) };
        this.notifyChange(newValue);
    };

    getUnitsOptions() {
        return ["day", "week", "month"].map(key => ({
            text: this.getTranslation(key),
            value: key,
        }));
    }

    notifyChange(value) {
        this.props.onChange({ target: { value } });
    }

    render() {
        const { labelText, value } = this.props;

        return (
            <div style={styles.wrapper}>
                <TextField
                    value={value.value}
                    style={styles.value}
                    type="number"
                    onChange={this.onValueChange}
                    floatingLabelText={labelText + " - " + this.getTranslation("value")}
                />

                <SelectField
                    value={value.units}
                    style={styles.unitsSelector}
                    onChange={this.onUnitChange}
                    floatingLabelText={this.getTranslation("units")}
                >
                    {this.renderOptions(this.unitsOptions)}
                </SelectField>
            </div>
        );
    }

    renderOptions(options) {
        return options.map((option, index) => (
            <MenuItem
                primaryText={option.text}
                key={index}
                value={option.value}
                label={option.text}
            />
        ));
    }
}

TimePeriodSelector.propTypes = {
    value: PropTypes.shape({
        units: PropTypes.oneOf(["day", "week", "month"]),
        value: PropTypes.number,
    }).isRequired,
    labelText: PropTypes.string.isRequired,
};

TimePeriodSelector.contextTypes = {
    d2: PropTypes.any,
};

const styles = {
    wrapper: { display: "flex" },
    value: { marginRight: 20, width: "25em" },
    unitsSelector: {},
};

export default TimePeriodSelector;
