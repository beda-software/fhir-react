import { Reference } from 'fhir/r4b';

export function parseFHIRReference(r: Reference) {
    if (!r || !r.reference) {
        return {};
    }

    const [resourceType, id] = r.reference?.split('/');

    return {
        id,
        resourceType,
    };
}
