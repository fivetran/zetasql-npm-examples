### Start server

```typescript
const ZETA_SQL_PORT = 50005;
...
let zetaSQLClient: ZetaSQLClient;
...
runServer(ZETA_SQL_PORT).catch(err => console.error(err));
ZetaSQLClient.init(ZETA_SQL_PORT);
zetaSQLClient = await ZetaSQLClient.getInstance();
```

### Enable Language Features

```typescript
const catalog = new SimpleCatalog('catalog');
...
const languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
await catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(languageOptions));
```

### Register tables

```typescript
...
const projectCatalog = new SimpleCatalog('<todo: project id>');
catalog.addSimpleCatalog(projectCatalog);
...
const datasetCatalog = new SimpleCatalog('<todo: dataset>');
projectCatalog.addSimpleCatalog(datasetCatalog);
...
const simpleTable = new SimpleTable('<todo: table name>');
datasetCatalog.addSimpleTable('<todo: table name>', simpleTable);
...
const simpleColumn = new SimpleColumn('<todo: table name>', '<todo: column name>', new SimpleType(<todo: column type, e.g. TypeKind.TYPE_INT64>));
simpleTable.addSimpleColumn(simpleColumn);
```

### Register catalog

```typescript
await catalog.register();
```

### Retrieve table names from SQL statement

```typescript
try {
    const extractResult = await zetaSQLClient.extractTableNamesFromStatement({
        sqlStatement: VALID_SQL_STATEMENT,
    });
    console.log(extractResult.tableName);
} catch (e) {
    console.log(e);
}
```

### Analyze request

```typescript
const analyzeRequest: AnalyzeRequest = {
    sqlStatement: sqlStatement,
    registeredCatalogId: catalog.registeredId,

    options: {
        parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,
        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: catalog.builtinFunctionOptions.languageOptions,
    },
};

...

try {
    const analyzeResponse = await ZetaSQLClient.getInstance().analyze(analyzeRequest);
    console.log('Analyze response was successfully received');
    console.log(analyzeResponse);
} catch (e: any) {
    console.log('There was an error wile parsing SQL query');
    ...
}
```
