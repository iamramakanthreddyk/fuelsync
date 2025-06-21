import { readFileSync } from 'fs';
import { Client } from 'pg';

interface ColumnDef {
  name: string;
  type: string;
}

interface TableDef {
  name: string;
  columns: ColumnDef[];
}

function parseTemplate(path: string): TableDef[] {
  const sql = readFileSync(path, 'utf8');
  const tableRegex = /CREATE TABLE IF NOT EXISTS \{\{schema_name\}\}\.(\w+) \(([^;]+)\);/gs;
  const tables: TableDef[] = [];
  let match;
  while ((match = tableRegex.exec(sql))) {
    const [_, tableName, body] = match;
    const columns: ColumnDef[] = [];
    for (const line of body.split(/\n/)) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CREATE') || trimmed.startsWith('PRIMARY KEY')) {
        continue;
      }
      const colMatch = trimmed.match(/^(\w+)\s+([A-Z]+)/i);
      if (colMatch) {
        columns.push({ name: colMatch[1], type: colMatch[2].toLowerCase() });
      }
    }
    tables.push({ name: tableName, columns });
  }
  return tables;
}

async function main() {
  const client = new Client();
  await client.connect();

  const tables = parseTemplate('migrations/tenant_schema_template.sql');

  const { rows: schemas } = await client.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`
  );

  let hasMismatch = false;

  for (const { schema_name } of schemas) {
    console.log(`Validating schema ${schema_name}`);
    for (const table of tables) {
      const { rows: tableRows } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2`,
        [schema_name, table.name]
      );
      if (tableRows.length === 0) {
        console.error(`Missing table ${schema_name}.${table.name}`);
        hasMismatch = true;
        continue;
      }
      const { rows: cols } = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,
        [schema_name, table.name]
      );
      const colMap: Record<string, string> = {};
      for (const c of cols) {
        colMap[c.column_name] = String(c.data_type).toLowerCase();
      }
      for (const expected of table.columns) {
        const actualType = colMap[expected.name];
        if (!actualType) {
          console.error(`Missing column ${schema_name}.${table.name}.${expected.name}`);
          hasMismatch = true;
        } else if (actualType !== expected.type) {
          console.error(
            `Type mismatch ${schema_name}.${table.name}.${expected.name}: expected ${expected.type} got ${actualType}`
          );
          hasMismatch = true;
        }
      }
    }
  }

  await client.end();

  if (hasMismatch) {
    console.error('Schema validation failed');
    process.exit(1);
  } else {
    console.log('Schema validation passed');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
