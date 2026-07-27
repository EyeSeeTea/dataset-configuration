type TextValue = { code: string; text: string; value: string };

export type AppSettingsData = {
    fields: TextValue[];
    countriesLevel: TextValue[];
    categories: TextValue[];
    combinations: TextValue[];
    dataElementsGroups: TextValue[];
    dataElementsGroupSets: TextValue[];
    indicatorsGroupSets: TextValue[];
    indicatorsGroups: TextValue[];
    userGroups: TextValue[];
};
