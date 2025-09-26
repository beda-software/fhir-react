## 1.10.0

-   Add low-level alternative to initServices - initServicesFromService Closes #7

## 1.9.1

-   Update clean FHIR resource logic:

    -   remove fields with null/undefined value;
    -   remove fields with empty object/array as a value;
    -   trim null/undefined elements of array value;
    -   keep null/undefined elements in the array value if there is;
    -   non empty element with higher index.

## 1.9.0

-   According to FHIR specification fields with empty values are not allowed (including empty objects and arrays). The exception is extension array with null values

## 1.8.0

-   Remote data services moved to the separate package [@beda.software/remote-data](https://www.npmjs.com/package/@beda.software/remote-data)

## 1.7.0

-   Extend usePager hook with loadPrevious, loadPage, hasPrevious, and currentPage properties.

## 1.6.0

-   Add a compiled and resolved build as default library import.

## 1.5.0

-   Fix useService hook performance

## 1.4.0

-   Add softReloadAsync ans reloadAsync to useService manager

## 1.3.3

-   Adjust the code for new ts

## 1.3.2

-   Fix build

## 1.3.0

-   findFHIRResources uses getFHIRResources under the hood
-   formatError respects OperationOutcome.issue.diagnostics in addition to OperationOutcome.issue.details.text

## 1.2.0

-   All requests helpers from FHIR module returns Resources wrapped with WithId type-wrapper.

## 1.1.1

-   Stable release
