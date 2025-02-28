# fhir-react

[![Build Status](https://travis-ci.org/beda-software/fhir-react.svg?branch=master)](https://travis-ci.org/beda-software/fhir-react) [![Coverage Status](https://coveralls.io/repos/github/beda-software/fhir-react/badge.svg?branch=master)](https://coveralls.io/github/beda-software/fhir-react?branch=master)

TypeScript library consisting of set of utils, functions and [React hooks](https://reactjs.org/docs/hooks-intro.html) to work with FHIR's [FHIR API](http://hl7.org/fhir/). Based on [axios](https://github.com/axios/axios).

So basically it is a javascript/typescript FHIR-client.

# Install

Clone this repository into `src/contrib/fhir-react`

# Introduction

## RemoteData

[RemoteData](https://github.com/beda-software/fhir-react/blob/master/src/libs/remoteData.ts) is a wrapper over data.

It could have four statuses:

-   Success
-   Failure
-   Loading
-   NotAsked

RemoteDataResult is a subset of RemoteData and it could have two statuses:

-   Success
-   Failure

When we make a request to a server with any of library's methods, we'll probably get RemoteData as a result. Then we can easily check what've got.

<details>
<summary>Simplified example</summary>

```TypeScript
import React from 'react';
import { Patient } from 'fhir/r4b';
import { getFHIRResource } from 'fhir-react/lib/services/fhir';
import { isFailure, isSuccess } from 'fhir-react/lib/libs/remoteData';

async function loadPatientGender() {
    const patientResponse = await getFHIRResource<Patient>({
        resourceType: 'Patient',
        id: 'patient-id',
    });
    if (isSuccess(patientResponse)) {
        return `Patient name is ${patientResponse.data.gender ?? 'unknown'}`;
    }
    if (isFailure(patientResponse)) {
        return `
            Failed to request patient,
            status: ${patientResponse.status},
            error : ${patientResponse.error}
        `;
    }
}
```

</details>

##

# Content

We consider service as a function that returns `RemoteDataResult<S, F>` (`RemoteDataSuccess<S> | RemoteDataSuccess<F>`). For details, see `RemoteData` interface in `fhir-react/libs/remoteData.ts`

## Available functions (services)

-   service({...axiosConfig})
-   FHIR-specific:
    -   getFHIRResource(reference)
    -   getFHIRResources(resourceType, params)
    -   getAllFHIRResources(resourceType, params)
    -   findFHIRResource(resourceType, params)
    -   saveFHIRResource(resource)
    -   createFHIRResource(resource)
    -   updateFHIRResource(resource, params)
    -   patchFHIRResource(resource, params)
    -   saveFHIRResources(resources, bundleType)
    -   deleteFHIRResource(resources)
    -   forceDeleteFHIRResource(resource)

### service({...axiosConfig})

Basic function for making requests.

```TypeScript
import { service } from 'fhir-react/lib/services/service';
import { formatError } from 'fhir-react/lib/utils/error';
import { isFailure, isSuccess } from 'fhir-react/lib/libs/remoteData';

async function deleteAccount() {
    const result = await service({
        url: '/User/$delete-account',
        method: 'POST',
    });
    if (isSuccess(result)) {
        await logout();
    } else if (isFailure(result)) {
        console.error(formatError(result.error));
    }
}
```

### getFHIRResource

Get resource by reference (resource type and id).

```TypeScript
import { getFHIRResource } from 'fhir-react/lib/services/fhir';
// ...

const observationResponse = await getFHIRResource<Observation>(makeReference('Observation', 'observation-id'));
```

### getFHIRResources

Get resources using [Search API](https://www.hl7.org/fhir/search.html)
Returns only first page of resources.

```TypeScript
import { getFHIRResources } from 'fhir-react/lib/services/fhir';
// ...

const qrBundleResponse = await getFHIRResources<QuestionnaireResponse>('QuestionnaireResponse', {
    subject: subject.id,
    questionnaire: 'intake',
    status: 'completed',
});
if (isSuccess(qrBundleResponse)) {
    // Iterate over found resources
    qrBundleResponse.data.entry?.forEach((bundleEntry) => {
        console.log(bundleEntry.resource?.status);
    });
}
```

### getAllFHIRResources

Get all found resources from all pages.

```TypeScript
import moment from 'moment';
import { getAllFHIRResources } from 'fhir-react/lib/services/fhir';
import { formatFHIRDateTime } from 'fhir-react/lib/utils/date';
// ...

const observationsResponse = await getAllFHIRResources<Observation>('Observation', {
    _sort: '-date',
    _count: 500,
    patient: 'patient-id',
    status: 'final',
    date: [`ge${formatFHIRDateTime(moment())}`],
});
```

### findFHIRResource

Uses [Search API](https://www.hl7.org/fhir/search.html) to find exactly one resource and return in (not bundle). It throws `Error('Too many resources found')` if more than one resources were found and `Error('No resources found')` if nothing were found.

<!-- TODO: Add try/catch example? -->

```TypeScript
import { findFHIRResource } from 'fhir-react/lib/services/fhir';

const roleResponse = await findFHIRResource<PractitionerRole>('PractitionerRole', {
    practitioner: 'practitioner-id',
});
```

### saveFHIRResource

Saves resource. If resource has `id` – uses `PUT` method (updates), otherwise `POST` (creates).
If you want to have more control, you can use `createFHIRResource` or `updateFHIRResource` functions.

```TypeScript
import { saveFHIRResource } from 'fhir-react/lib/services/fhir';
// ...

const saveResponse = await saveFHIRResource({
    resourceType: 'Patient',
    gender: 'female',
});

if (isFailure(saveResponse)) {
    console.warn('Can not create a patient: ', JSON.stringify(saveResponse.error));
}
```

### createFHIRResource(resource)

Creates resource via `POST` command.
The difference with `saveFHIRResource` is that `createFHIRResource` always use `POST`, even if resource has `id` field.

```TypeScript
const resource = {
    id: '1',
    resourceType: 'Patient',
};

await createFHIRResource(resource);
```

### updateFHIRResource(resource, params)

Updates resource using `PUT` request.

It's required to have either resource's id or pass `params`.

```TypeScript
const resource = {
    resourceType: 'Patient',
    name: [{text: 'Alex'}]
};
const searchParams = { identifier: 'alex-1' };

const updateResponse = await updateFHIRResource(resource, searchParams);
```

### patchFHIRResource(resource, params)

Use `PATCH` method to patch a resource.

It's required to have either resource's id or pass `params`.

```TypeScript
const resource = {
    resourceType: 'Patient',
    name: [{text: 'Jennifer'}],
    gender: 'female'
};

const createResponse = await createFHIRResource(resource);
if (isSuccess(createResponse)) {
    const patchResponse = await patchFHIRResource({
        id: createResponse.data.id,
        name: [{text: 'Monica'}]
    });
}
```

### saveFHIRResources(resources, bundleType)

Save an array of resources using `POST` request.

Method for every resource will be either `PUT` (if resource's id presented) or

```TypeScript
const bundleResponse = await saveFHIRResources([
    {
        id: 'jennifer-1',
        resourceType: 'Patient',
        name: [{text: 'Jennifer'}]
    },
    {
        resourceType: 'Patient',
        name: [{text: 'Monica'}]
    }
], 'transaction');
```

### deleteFHIRResource(resources)

Actually it doesn't delete a resource, just mark it as deleted by altering its status (see `inactiveMapping` list in `fhir.ts`).

```TypeScript
await deleteFHIRResource(makeReference('Patient', 'patient-id'));
```

### forceDeleteFHIRResource(resource)

Deletes resource by calling `DELETE` method.

```TypeScript
const createResponse = await createFHIRResource({
    resourceType: 'Patient',
    name: [{text: 'Max'}]
});
if (isSuccess(createResponse)) {
    const deleteResource = await forceDeleteFHIRResource(makeReference('Patient', createResponse.data.id));
}
```

## Available hooks

-   useService(serviceFn)
-   usePager(resourceType, resourcesOnPage?, searchParams?)
-   useCRUD(resourceType, id?, getOrCreate?, defaultResource?) - WIP

# Usage

Set baseURL and token for axios instance using `setInstanceBaseURL` and `setInstanceToken/resetInstanceToken` from `fhir-react/services/instance`
And use hooks and services

# Examples

## Pager hook

```TSX
import * as React from 'react';

import { Patient } from 'fhir/r4b';
import { usePager } from 'src/contrib/fhir-react/services/service';
import { isLoading, isSuccess } from 'src/contrib/fhir-react/libs/remoteData';
import { extractBundleResources } from 'src/contrib/fhir-react/services/fhir';

export function PatientList(props: {}) {
    const [resourcesResponse, pagerManager] = usePager<Patient>('Patient', 2);

    if (isLoading(resourcesResponse)) {
        return <div>Loading...</div>;
    }

    if (isSuccess(resourcesResponse)) {
        const patients = extractBundleResources(resourcesResponse.data).Patient || [];

        return (
            <div>
                <a onClick={() => pagerManager.loadNext()}>Load next</a>

                {patients.map((patient) => (
                    <div key={patient.id}>{patient.id}</div>
                ))}
            </div>
        );
    }

    return null;
}
```

## CRUD hook

```TSX
import * as React from 'react';

import { useCRUD } from 'src/contrib/fhir-react/hooks/crud';
import { isLoading, isSuccess } from 'src/contrib/fhir-react/libs/remoteData';
import { Patient } from 'shared/src/contrib/fhir';

export function UserList(props: {}) {
    const [resourceResponse, crudManager] = useCRUD<Patient>('Patient', 'toggle', true, {
        resourceType: 'Patient',
        active: false,
    });

    if (isLoading(resourceResponse)) {
        return <div>Loading...</div>;
    }

    if (isSuccess(resourceResponse)) {
        // This is just an example
        const active = resourceResponse.data.active;

        return (
            <div>
                Active: {active ? 'Yes' : 'No'}
                <a
                    onClick={() =>
                        crudManager.handleSave({
                            ...resourceResponse.data,
                            active: !active,
                        })
                    }
                >
                    Toggle
                </a>
            </div>
        );
    }
    return null;
}
```
