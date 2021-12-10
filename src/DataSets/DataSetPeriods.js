import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import _ from "lodash";
import FormBuilder from "d2-ui/lib/forms/FormBuilder.component";

import FormHelpers from "../forms/FormHelpers";
import { currentUserHasAdminRole } from "../utils/Dhis2Helpers";

export default class DataSetPeriods extends React.Component {
    static propTypes = {
        store: PropTypes.object.isRequired,
        onFieldChange: PropTypes.func.isRequired,
        endYear: PropTypes.number,
    };

    static contextTypes = {
        d2: PropTypes.any,
    };

    styles = {
        dateFieldWrapStyle: { float: "left", marginRight: 20 },
        applyToAll: { marginLeft: 20, marginTop: 25, marginBottom: -15 },
        periodYearLabel: { float: "left", marginLeft: 20, marginTop: 41, marginRight: 20 },
    };

    constructor(props, context) {
        super(props);
        this.getTranslation = context.d2.i18n.getTranslation.bind(context.d2.i18n);
        this.currentUserHasAdminRole = currentUserHasAdminRole(context.d2);
    }

    getPeriodFields(years) {
        const { store, onFieldChange, endYear } = this.props;
        const { currentUserHasAdminRole } = this;
        const { associations } = this.props.store;
        const { getFormLabel, getDateField, getBooleanField, separator } = FormHelpers;
        const t = this.getTranslation;
        const startDate = associations.dataInputStartDate;
        const periodDates = store.getPeriodDates();
        const periodYears = store.getPeriodYears();

        if (!currentUserHasAdminRole || _.isEmpty(periodYears)) return [];

        const generateDateFieldPairs = type => {
            return _.flatMap(years, (year, index) => {
                const disabled = index > 0 && associations.periodDatesApplyToAll[type];
                const showApplyToAllYearsCheckbox = !endYear && index === 0 && years.length > 1;
                const validators = [
                    {
                        validator: value => {
                            const startDate = associations.dataInputStartDate;
                            const startDateM = startDate ? moment(startDate).startOf("day") : null;
                            return !value || !startDateM || moment(value).isSameOrAfter(startDateM);
                        },
                        message: t("start_date_before_project_start"),
                    },
                ];

                return _.compact([
                    showApplyToAllYearsCheckbox
                        ? getBooleanField({
                              name: `associations.periodDatesApplyToAll.${type}`,
                              label: t("apply_periods_to_all"),
                              value: associations.periodDatesApplyToAll[type],
                              onChange: onFieldChange,
                              style: this.styles.applyToAll,
                          })
                        : null,
                    !endYear &&
                        getFormLabel({
                            value: year,
                            forSection: type,
                            style: this.styles.periodYearLabel,
                        }),
                    !endYear &&
                        getDateField({
                            name: `associations.periodDates.${type}.${year}.start`,
                            value: _(periodDates).get([type, year, "start"]),
                            label: t(`${type}_start_date`) + " " + year,
                            minDate: startDate,
                            disabled,
                            validators,
                            wrapStyle: this.styles.dateFieldWrapStyle,
                        }),
                    (!endYear || year === endYear) &&
                        getDateField({
                            name: `associations.periodDates.${type}.${year}.end`,
                            value: _(periodDates).get([type, year, "end"]),
                            label: t(`${type}_end_date`) + " " + year,
                            minDate: startDate,
                            disabled,
                            wrapStyle: this.styles.dateFieldWrapStyle,
                        }),
                    separator(`${type}-${year}-end`),
                ]);
            });
        };

        return [
            getFormLabel({ value: t("output_dates") }),
            separator("output-dates"),
            ...generateDateFieldPairs("output"),
            getFormLabel({ value: t("outcome_dates") }),
            separator("outcome-dates"),
            ...generateDateFieldPairs("outcome"),
        ];
    }

    render() {
        const { store, onFieldChange, endYear } = this.props;
        const { associations } = store;
        const years = store.getPeriodYears();
        const formKey = JSON.stringify([years, store.associations.periodDatesApplyToAll]);

        const fields = [
            !endYear &&
                FormHelpers.getDateField({
                    name: "associations.dataInputStartDate",
                    value: associations.dataInputStartDate,
                    label: FormHelpers.getLabel(this.getTranslation("data_input_start_date")),
                    wrapStyle: this.styles.dateFieldWrapStyle,
                }),

            !endYear &&
                FormHelpers.getDateField({
                    name: "associations.dataInputEndDate",
                    value: associations.dataInputEndDate,
                    label: FormHelpers.getLabel(this.getTranslation("data_input_end_date")),
                    wrapStyle: this.styles.dateFieldWrapStyle,
                }),

            FormHelpers.separator("period-fields"),

            ...this.getPeriodFields(years),
        ];

        return (
            <FormBuilder key={formKey} fields={_.compact(fields)} onUpdateField={onFieldChange} />
        );
    }
}
