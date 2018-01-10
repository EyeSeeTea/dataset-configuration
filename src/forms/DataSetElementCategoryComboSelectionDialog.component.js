import React, { PropTypes } from 'react';
import withState from 'recompose/withState';
import withHandlers from 'recompose/withHandlers';
import compose from 'recompose/compose';
import getContext from 'recompose/getContext';
import IconButton from 'material-ui/IconButton/IconButton';
import BuildIcon from 'material-ui/svg-icons/action/build';
import Dialog from 'material-ui/Dialog/Dialog';
import FlatButton from 'material-ui/FlatButton/FlatButton';
import Column from 'd2-ui/lib/layout/Column.component';
import Row from 'd2-ui/lib/layout/Row.component';
import SelectField from 'material-ui/SelectField/SelectField';
import MenuItem from 'material-ui/MenuItem/MenuItem';
import { map, memoize } from 'lodash/fp';
import Translate from 'd2-ui/lib/i18n/Translate.component';
import {collectionToArray} from '../utils/Dhis2Helpers';
import _ from 'lodash';
import fp from 'lodash/fp';

const enhance = compose(
    getContext({ d2: PropTypes.object }),
    withState('open', 'updateOpen', false),
    withHandlers({
        onRequestClose: props => () => {
            props.updateOpen(false);
        },
        onRequestOpen: props => () => {
            props.updateOpen(true);
        },
    })
);

const getCategoryOptions = (categoryCombo) => {
    if (categoryCombo.isDefault) {
        return "";
    } else {
        return collectionToArray(categoryCombo.categories)
            .map(category => collectionToArray(category.categoryOptions).map(co => co.displayName).join(" - "))
            .join(" / ");
    }
}

const getOptions = memoize(function (categoryCombos) {
    return categoryCombos.map(categoryCombo => {
        const {displayName, id} = categoryCombo;
        const categoryOptions = getCategoryOptions(categoryCombo);
        return (<MenuItem key={id} primaryText={displayName} value={id} title={categoryOptions} />);
    });
});

const enhanceCategoryComboSelectField = withHandlers({
        onChange: ({ categoryCombos = new Map, onChange }) => (event, index, value) => {
            onChange(categoryCombos.find(categoryCombo => categoryCombo.id === value));
        },
    });

const CategoryComboSelectField = enhanceCategoryComboSelectField(
    function CategoryComboSelectField({ categoryCombos, categoryCombo, onChange }) {
        const options = getOptions(categoryCombos);

        return (
            <SelectField
                value={categoryCombo ? categoryCombo.id : null}
                title={getCategoryOptions(categoryCombo)}
                onChange={onChange}
                fullWidth
                floatingLabelText={<Translate>override_data_element_category_combo</Translate>}
            >
                {options}
            </SelectField>
        );
    }
);

const createGetCategoryCombosForSelect = (d2, categoryCombos) => {
    return memoize((dataElementCategoryCombo, selectedCatCombo) => {
        // Not in maintenance-app: show only category combos whose categories do not
        // intersect with the dataElement categories.
        const deCategoryIds = dataElementCategoryCombo.categories.map(category => category.id);
        const categoryCombosWithoutOverlap = categoryCombos.filter(categoryCombo => {
            const categoryIds = categoryCombo.categories.toArray().map(category => category.id);
            return (
                dataElementCategoryCombo.id == categoryCombo.id ||
                _(deCategoryIds).intersection(categoryIds).isEmpty()
            );
            
        }).map(categoryCombo => {
            const categoryIds = categoryCombo.categories.toArray().map(category => category.id);
            const isSelected = _.isEqual(
                deCategoryIds.concat(categoryIds).sort(),
                collectionToArray(selectedCatCombo.categories).map(c => c.id).sort(),
            );
            return isSelected ? fp.merge(categoryCombo, {id: selectedCatCombo.id}) : categoryCombo;
        });

        return categoryCombosWithoutOverlap
        .reduce((acc, categoryCombo) => {
            if (categoryCombo.id === dataElementCategoryCombo.id) {
                acc.unshift({
                    ...categoryCombo,
                    displayName: d2.i18n.getTranslation('no_override'),
                });
                return acc;
            }

            acc.push(categoryCombo);
            return acc;
        }, [])
        .filter(cc => {
            if (cc.id === selectedCatCombo.id || cc.id === dataElementCategoryCombo.id) {
                return true;
            } else if (cc.isDefault || collectionToArray(cc.categories).length > 1) {
                return false;
            } else {
                return true;
            }
        });
    });
};


function DataSetElementList({ dataSetElements, categoryCombos, onCategoryComboSelected, canEdit }, { d2 }) {
    const styles = {
        elementListItem: {
            width: '49%',
        },

        noDataElementMessage: {
            paddingTop: '2rem',
        },

        originalCategoryCombo: {
            color: '#CCC',
            fontSize: '1rem',
            fontWeight: '300',
        },
    };

    const getCategoryCombosForSelect = createGetCategoryCombosForSelect(d2, categoryCombos);

    const dataSetElementsRows = dataSetElements
        .map(({ categoryCombo = {}, dataElement = {}, id }) => {
            const selectedCatCombo = (categoryCombo.source || categoryCombo);
            const categoryCombosForSelect = getCategoryCombosForSelect(dataElement.categoryCombo, selectedCatCombo);
            const categoryOptions = getCategoryOptions(dataElement.categoryCombo);

            return (
                <Row key={id} style={{ alignItems: 'center', marginBottom: canEdit ? 0 : 10}} >
                    <div style={styles.elementListItem}>
                        <div>{dataElement.displayName}</div>
                        <div title={categoryOptions} style={styles.originalCategoryCombo}>
                            {dataElement.categoryCombo.displayName}
                        </div>
                    </div>
                    {canEdit ?
                        <div style={styles.elementListItem}>
                            <CategoryComboSelectField
                                categoryCombos={categoryCombosForSelect}
                                categoryCombo={selectedCatCombo}
                                onChange={(categoryCombo) => onCategoryComboSelected(id, categoryCombo)}
                            />
                        </div> : <div />}
                </Row>
            )
        });

    if (dataSetElementsRows.length === 0) {
        return (
            <div style={styles.noDataElementMessage}>
                {d2.i18n.getTranslation('select_a_data_element_before_applying_an_override')}
            </div>
        );
    }

    return (
        <Column>
            {dataSetElementsRows}
        </Column>
    );
}

DataSetElementList.contextTypes = {
    d2: PropTypes.object,
}

export function DataSetElementCategoryComboSelection(props) {
    const {
        categoryCombos,
        dataSetElements,
        onCategoryComboSelected,
        canEdit,
        d2: { i18n }
    } = props;

    const actions = [
        <FlatButton
            label={i18n.getTranslation('close')}
            primary={true}
            onTouchTap={props.onRequestClose}
        />,
    ];

    return (
        <div>
            <DataSetElementList
                dataSetElements={Array.from(dataSetElements || [])}
                categoryCombos={categoryCombos}
                onCategoryComboSelected={onCategoryComboSelected}
                canEdit={canEdit}
            />
        </div>
    );
}

export default enhance(DataSetElementCategoryComboSelection);
