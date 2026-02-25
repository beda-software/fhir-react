import { InactiveMapping } from './fhir/apiConfigs';

export const defaultInactiveMapping: InactiveMapping = {
    DocumentReference: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Observation: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Location: {
        searchField: 'status',
        statusField: 'status',
        value: 'inactive',
    },
    Schedule: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Slot: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    Practitioner: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Patient: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    User: {
        searchField: 'active',
        statusField: 'active',
        value: false,
    },
    Note: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
    EpisodeOfCare: {
        searchField: 'status',
        statusField: 'status',
        value: 'entered-in-error',
    },
};
