import { AnalyzeRequest, runServer, SimpleCatalog, SimpleColumn, SimpleTable, SimpleType, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { ExtractTableNamesFromStatementRequest } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementRequest';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';

const ZETA_SQL_PORT = 50005;

const PROJECT_ID = 'sample-shop';
const DATASET = 'default_dataset';
const TABLES = [
  {
    name: 'users',
    columns: [
      {
        name: 'id',
        type: TypeKind.TYPE_INT64
      },
      {
        name: 'name',
        type: TypeKind.TYPE_STRING
      }
    ]
  },
  {
    name: 'orders',
    columns: [
      {
        name: 'user_id',
        type: TypeKind.TYPE_INT64
      }
    ]
  }
];

const VALID_SQL_STATEMENT = "select *\n" +
  "from `sample-shop`.default_dataset.users\n" +
  "inner join `sample-shop`.default_dataset.orders on users.id = orders.user_id\n" +
  "where users.name like '%John%';";
const INVALID_SQL_STATEMENT = "select *\n" +
  "from `sample-shop`.default_dataset.users\n" +
  "join inner `sample-shop`.default_dataset.orders on users.id = orders.user_id\n" +
  "where users.name like '%John%';";

let zetaSQLClient: ZetaSQLClient;
const catalog = new SimpleCatalog('catalog');

async function runZetaSQLServer(): Promise<void> {
  runServer(ZETA_SQL_PORT).catch(err => console.error(err));
  ZetaSQLClient.init(ZETA_SQL_PORT);
  zetaSQLClient = await ZetaSQLClient.getInstance();

  const testResult = await zetaSQLClient.testConnection();
  if (!testResult) {
    throw new Error('Unable to instantiate ZetaSQL client');
  }
}

async function initializeZetaSQL(): Promise<void> {
  const projectCatalog = new SimpleCatalog(PROJECT_ID);
  catalog.addSimpleCatalog(projectCatalog);

  const datasetCatalog = new SimpleCatalog(DATASET);
  projectCatalog.addSimpleCatalog(datasetCatalog);

  for (const table of TABLES) {
    const simpleTable = new SimpleTable(table.name);
    datasetCatalog.addSimpleTable(table.name, simpleTable);

    for (const column of table.columns) {
      const simpleColumn = new SimpleColumn(table.name, column.name, new SimpleType(column.type));
      simpleTable.addSimpleColumn(simpleColumn);
    }
  }

  await enableLanguageFeatures();

  try {
    await catalog.register();
  } catch (e) {
    console.error(e);
  }
}

async function enableLanguageFeatures(): Promise<void> {
  const languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
  await catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(languageOptions));
}

async function testTableNamesExtraction() {
  const request: ExtractTableNamesFromStatementRequest = {
    sqlStatement: VALID_SQL_STATEMENT,
  };

  try {
    const extractResult = await zetaSQLClient.extractTableNamesFromStatement(request);
    console.log(extractResult?.tableName);
  } catch (e) {
    console.log(e);
  }
}

async function testAnalyzeRequest(sqlStatement: string) {
  const analyzeRequest: AnalyzeRequest = {
    sqlStatement: sqlStatement,
    registeredCatalogId: catalog.registeredId,

    options: {
      parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,
      errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
      languageOptions: catalog.builtinFunctionOptions?.languageOptions,
    },
  };
    
  try {
    const analyzeResponse = await ZetaSQLClient.getInstance().analyze(analyzeRequest);
    console.log('Analyze response was successfully received');
    console.log(analyzeResponse);
  } catch (e: any) {
    console.log('There was an error wile parsing SQL query');
    if (e.code === 3) {
      const matchResults = e.details.match(/(.*?) \[at (\d+):(\d+)\]/);
      const line = matchResults[2] - 1;
      const character = matchResults[3] - 1;

      console.log(`Line: ${line}`);
      console.log(`Character: ${character}`);
      console.log(`Message: ${matchResults[1]}`);
    }
  }
}

runZetaSQLServer().then(async () => {
  await initializeZetaSQL();
  console.log('\n');

  console.log('Extract tables names from SQL statement:\n');
  await testTableNamesExtraction();
  console.log('\n');

  console.log('Analyze valid SQL statement:\n');
  await testAnalyzeRequest(VALID_SQL_STATEMENT);
  console.log('\n');

  console.log('Analyze invalid SQL statement:\n');
  await testAnalyzeRequest(INVALID_SQL_STATEMENT);
  console.log('\n');
});
