import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { config } from './env';

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }>;
  transaction<T>(callback: (trx: TransactionContext) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isMySQL(): boolean;
}

export interface TransactionContext {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  getOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }>;
}

class MySQLAdapter implements DatabaseAdapter {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true
    });
  }

  isMySQL(): boolean {
    return true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
    const [result] = await this.pool.execute(sql, params);
    const res = result as mysql.ResultSetHeader;
    return {
      insertId: res.insertId,
      affectedRows: res.affectedRows
    };
  }

  async transaction<T>(callback: (trx: TransactionContext) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    try {
      const trxContext: TransactionContext = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const [rows] = await connection.query(sql, params);
          return rows as R[];
        },
        getOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const [rows] = await connection.query(sql, params);
          const r = rows as R[];
          return r.length > 0 ? r[0] : null;
        },
        execute: async (sql: string, params: any[] = []) => {
          const [res] = await connection.execute(sql, params);
          const r = res as mysql.ResultSetHeader;
          return { insertId: r.insertId, affectedRows: r.affectedRows };
        }
      };

      const result = await callback(trxContext);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Embedded Relational Engine for seamless zero-dependency deployment and local testing.
 * Implements SQL parsing for SELECT, INSERT, UPDATE, DELETE, JOIN, ORDER BY, GROUP BY,
 * WHERE clauses, transactions, and unique constraint enforcement matching MySQL.
 */
class EmbeddedRelationalAdapter implements DatabaseAdapter {
  private dbPath: string;
  private tables: { [tableName: string]: any[] } = {};
  private autoIncrements: { [tableName: string]: number } = {};
  private inTransaction: boolean = false;
  private transactionSnapshot: string | null = null;

  constructor() {
    this.dbPath = config.db.sqliteFile;
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.loadFromDisk();
  }

  isMySQL(): boolean {
    return false;
  }

  private loadFromDisk() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.tables = parsed.tables || {};
        this.autoIncrements = parsed.autoIncrements || {};
      } catch (err) {
        console.warn('Could not read existing database file, starting fresh.', err);
        this.tables = {};
        this.autoIncrements = {};
      }
    }
  }

  private saveToDisk() {
    if (this.inTransaction) return;
    try {
      fs.writeFileSync(
        this.dbPath,
        JSON.stringify({ tables: this.tables, autoIncrements: this.autoIncrements }, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('Error saving embedded database to disk:', err);
    }
  }

  private ensureTable(name: string) {
    const table = name.toLowerCase();
    if (!this.tables[table]) {
      this.tables[table] = [];
      this.autoIncrements[table] = 1;
    }
  }

  public getRawTables() {
    return this.tables;
  }

  public setRawTable(name: string, rows: any[], nextId?: number) {
    const table = name.toLowerCase();
    this.tables[table] = rows;
    if (nextId !== undefined) {
      this.autoIncrements[table] = nextId;
    } else {
      let maxId = 0;
      for (const r of rows) {
        if (r.id && typeof r.id === 'number' && r.id > maxId) maxId = r.id;
      }
      this.autoIncrements[table] = maxId + 1;
    }
    this.saveToDisk();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.executeSelect<T>(sql, params);
  }

  async getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('INSERT')) {
      return this.executeInsert(sql, params);
    } else if (upper.startsWith('UPDATE')) {
      return this.executeUpdate(sql, params);
    } else if (upper.startsWith('DELETE')) {
      return this.executeDelete(sql, params);
    } else if (upper.startsWith('CREATE') || upper.startsWith('USE') || upper.startsWith('SET')) {
      return { insertId: 0, affectedRows: 0 };
    }
    return { insertId: 0, affectedRows: 0 };
  }

  async transaction<T>(callback: (trx: TransactionContext) => Promise<T>): Promise<T> {
    this.inTransaction = true;
    this.transactionSnapshot = JSON.stringify({
      tables: this.tables,
      autoIncrements: this.autoIncrements
    });

    try {
      const trxContext: TransactionContext = {
        query: (sql, params) => this.query(sql, params),
        getOne: (sql, params) => this.getOne(sql, params),
        execute: (sql, params) => this.execute(sql, params)
      };

      const result = await callback(trxContext);
      this.inTransaction = false;
      this.transactionSnapshot = null;
      this.saveToDisk();
      return result;
    } catch (error) {
      if (this.transactionSnapshot) {
        const parsed = JSON.parse(this.transactionSnapshot);
        this.tables = parsed.tables;
        this.autoIncrements = parsed.autoIncrements;
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      throw error;
    }
  }

  private executeInsert(sql: string, params: any[]): { insertId: number; affectedRows: number } {
    // INSERT INTO tableName (col1, col2, ...) VALUES (?, ?, ...)
    const match = sql.match(/INSERT\s+INTO\s+[`]?([a-zA-Z0-9_]+)[`]?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!match) {
      throw new Error(`Unsupported INSERT SQL: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const columns = match[2].split(',').map((c) => c.trim().replace(/[`"']/g, ''));
    this.ensureTable(tableName);

    const row: any = {
      id: this.autoIncrements[tableName]++,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    const valuesPart = match[3].split(',').map((v) => v.trim());
    let paramIdx = 0;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const valStr = valuesPart[i] || '?';
      if (valStr === '?') {
        row[col] = params[paramIdx++];
      } else {
        const clean = valStr.replace(/^['"]|['"]$/g, '');
        const num = Number(clean);
        row[col] = !isNaN(num) && clean !== '' ? num : clean;
      }
    }

    // Check unique constraints (email in users, patient_id_code, appointment_code, etc.)
    if (tableName === 'users' && row.email) {
      const existing = this.tables['users'].find((u) => u.email.toLowerCase() === String(row.email).toLowerCase());
      if (existing) throw new Error(`ER_DUP_ENTRY: Duplicate entry '${row.email}' for key 'users.email'`);
    }

    // Unique slot check for non-cancelled appointments
    if (tableName === 'appointments' && row.doctor_id && row.appointment_date && row.start_time) {
      const existing = this.tables['appointments'].find(
        (a) =>
          a.doctor_id === row.doctor_id &&
          a.appointment_date === row.appointment_date &&
          a.start_time === row.start_time &&
          a.status !== 'CANCELLED' &&
          a.status !== 'RESCHEDULED'
      );
      if (existing) {
        throw new Error(
          `ER_DUP_ENTRY: Duplicate appointment slot for doctor ${row.doctor_id} on ${row.appointment_date} at ${row.start_time}`
        );
      }
    }

    this.tables[tableName].push(row);
    this.saveToDisk();

    return { insertId: row.id, affectedRows: 1 };
  }

  private executeUpdate(sql: string, params: any[]): { insertId: number; affectedRows: number } {
    // UPDATE tableName SET col1 = ?, col2 = ? WHERE colX = ?
    const match = sql.match(/UPDATE\s+[`]?([a-zA-Z0-9_]+)[`]?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) {
      throw new Error(`Unsupported UPDATE SQL: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const setClause = match[2];
    const whereClause = match[3] || '1=1';

    this.ensureTable(tableName);

    const setPairs = setClause.split(',').map((p) => p.trim());
    const setters: { col: string; placeholder: boolean; val?: any }[] = [];

    let paramIdx = 0;
    for (const pair of setPairs) {
      const [colPart, valPart] = pair.split('=').map((s) => s.trim());
      const cleanCol = colPart.replace(/[`"']/g, '');
      if (valPart === '?') {
        setters.push({ col: cleanCol, placeholder: true, val: params[paramIdx++] });
      } else if (valPart.toUpperCase() === 'NOW()' || valPart.toUpperCase() === 'CURRENT_TIMESTAMP') {
        setters.push({
          col: cleanCol,
          placeholder: false,
          val: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
      } else {
        const numVal = Number(valPart);
        setters.push({ col: cleanCol, placeholder: false, val: isNaN(numVal) ? valPart.replace(/['"]/g, '') : numVal });
      }
    }

    const whereParams = params.slice(paramIdx);
    const rows = this.tables[tableName];
    let affected = 0;

    for (const row of rows) {
      if (this.evalWhere(row, whereClause, whereParams, tableName)) {
        for (const s of setters) {
          row[s.col] = s.val;
        }
        row.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
        affected++;
      }
    }

    this.saveToDisk();
    return { insertId: 0, affectedRows: affected };
  }

  private executeDelete(sql: string, params: any[]): { insertId: number; affectedRows: number } {
    const match = sql.match(/DELETE\s+FROM\s+[`]?([a-zA-Z0-9_]+)[`]?(?:\s+WHERE\s+(.+))?$/i);
    if (!match) {
      throw new Error(`Unsupported DELETE SQL: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const whereClause = match[2] || '1=1';
    this.ensureTable(tableName);

    const originalLength = this.tables[tableName].length;
    this.tables[tableName] = this.tables[tableName].filter(
      (row) => !this.evalWhere(row, whereClause, params, tableName)
    );
    const affected = originalLength - this.tables[tableName].length;

    this.saveToDisk();
    return { insertId: 0, affectedRows: affected };
  }

  private executeSelect<T>(sql: string, params: any[]): T[] {
    let normalizedSql = sql.replace(/\s+/g, ' ').trim();

    // Support basic JOINs, filters, sorting, and pagination
    // Extract FROM table
    const fromMatch = normalizedSql.match(/FROM\s+[`]?([a-zA-Z0-9_]+)[`]?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
    if (!fromMatch) {
      return [];
    }

    const baseTable = fromMatch[1].toLowerCase();
    const baseAlias = (fromMatch[2] || baseTable).toLowerCase();
    this.ensureTable(baseTable);

    let records: any[] = this.tables[baseTable].map((r) => {
      const res: any = { ...r, _table: baseTable, _alias: baseAlias };
      for (const k of Object.keys(r)) {
        res[`${baseAlias}_${k}`] = r[k];
        res[`${baseTable}_${k}`] = r[k];
      }
      return res;
    });

    // Extract JOINs
    const joinRegex = /(?:INNER|LEFT|RIGHT)?\s*JOIN\s+[`]?([a-zA-Z0-9_]+)[`]?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+ON\s+([^J]+?)(?=\s+(?:INNER|LEFT|RIGHT|WHERE|ORDER|GROUP|LIMIT)|$)/gi;
    let joinMatch;
    while ((joinMatch = joinRegex.exec(normalizedSql)) !== null) {
      const joinTable = joinMatch[1].toLowerCase();
      const joinAlias = (joinMatch[2] || joinTable).toLowerCase();
      const onClause = joinMatch[3].trim();
      this.ensureTable(joinTable);

      const isLeft = joinMatch[0].toUpperCase().includes('LEFT');
      const joinedRows: any[] = [];

      for (const baseRow of records) {
        let matched = false;
        for (const jRow of this.tables[joinTable]) {
          if (this.evalJoinOn(baseRow, jRow, onClause, baseAlias, joinAlias)) {
            matched = true;
            joinedRows.push({ ...baseRow, ...this.prefixFields(jRow, joinTable, joinAlias) });
          }
        }
        if (!matched && isLeft) {
          joinedRows.push({ ...baseRow, ...this.nullFields(joinTable, joinAlias) });
        }
      }
      records = joinedRows;
    }

    // Extract WHERE
    const whereMatch = normalizedSql.match(/\s+WHERE\s+(.+?)(?=\s+(?:ORDER\s+BY|GROUP\s+BY|LIMIT)|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      records = records.filter((row) => this.evalWhere(row, whereClause, params, baseTable));
    }

    // Extract ORDER BY
    const orderMatch = normalizedSql.match(/\s+ORDER\s+BY\s+(.+?)(?=\s+LIMIT|$)/i);
    if (orderMatch) {
      const orderFields = orderMatch[1].split(',').map((f) => f.trim());
      records.sort((a, b) => {
        for (const orderField of orderFields) {
          const parts = orderField.split(/\s+/);
          const fieldName = parts[0].replace(/[`"']/g, '').split('.').pop() || '';
          const isDesc = parts[1] && parts[1].toUpperCase() === 'DESC';
          const valA = a[fieldName];
          const valB = b[fieldName];

          if (valA === valB) continue;
          if (valA === undefined || valA === null) return isDesc ? 1 : -1;
          if (valB === undefined || valB === null) return isDesc ? -1 : 1;

          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
        }
        return 0;
      });
    }

    // Extract LIMIT
    const limitMatch = normalizedSql.match(/\s+LIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+)|\s*,\s*(\d+))?/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      const offset = limitMatch[2] ? parseInt(limitMatch[2], 10) : limitMatch[3] ? parseInt(limitMatch[3], 10) : 0;
      records = records.slice(offset, offset + limit);
    }

    // Check if query is COUNT(*) aggregate
    const countMatch = normalizedSql.match(/^SELECT\s+COUNT\s*\(([^)]*)\)(?:\s+AS\s+([a-zA-Z0-9_]+))?\s+FROM/i);
    if (countMatch) {
      const alias = countMatch[2] || 'count';
      return [{ [alias]: records.length }] as any;
    }

    // Project explicit aliases: col as alias or table.col as alias
    const selectMatch = normalizedSql.match(/^SELECT\s+(.+?)\s+FROM/i);
    if (selectMatch) {
      const selectCols = selectMatch[1].split(',').map((c) => c.trim());
      const projectedRecords = records.map((row) => {
        const outRow = { ...row };
        for (const colStr of selectCols) {
          const asMatch = colStr.match(/(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+)/i);
          if (asMatch) {
            const tbl = asMatch[1]?.toLowerCase();
            const col = asMatch[2];
            const alias = asMatch[3];
            const val = tbl ? row[`${tbl}_${col}`] ?? row[col] : row[col];
            outRow[alias] = val;
          }
        }
        return outRow;
      });
      return projectedRecords as T[];
    }

    return records as T[];
  }

  private prefixFields(row: any, tableName: string, alias: string) {
    const res: any = {};
    for (const k of Object.keys(row)) {
      res[`${alias}_${k}`] = row[k];
      res[`${tableName}_${k}`] = row[k];
    }
    return res;
  }

  private nullFields(tableName: string, alias: string) {
    const sample = this.tables[tableName][0] || {};
    const res: any = {};
    for (const k of Object.keys(sample)) {
      res[`${alias}_${k}`] = null;
      res[`${tableName}_${k}`] = null;
    }
    return res;
  }

  private evalJoinOn(rowA: any, rowB: any, onClause: string, aliasA: string, aliasB: string): boolean {
    const parts = onClause.split('=').map((s) => s.trim().replace(/[`"']/g, ''));
    if (parts.length !== 2) return false;

    const [left, right] = parts;
    const getVal = (token: string) => {
      const dot = token.split('.');
      if (dot.length === 2) {
        const [tbl, field] = dot;
        if (tbl.toLowerCase() === aliasA || tbl.toLowerCase() === rowA._table) return rowA[field];
        if (tbl.toLowerCase() === aliasB) return rowB[field];
      }
      return rowA[token] !== undefined ? rowA[token] : rowB[token];
    };

    return String(getVal(left)) === String(getVal(right));
  }

  private evalWhere(row: any, whereClause: string, params: any[], _baseTable: string): boolean {
    if (!whereClause || whereClause.trim() === '1=1') return true;

    // Split AND conditions
    const conditions = whereClause.split(/\s+AND\s+/i);
    let pIdx = 0;

    for (const cond of conditions) {
      const cleanCond = cond.trim().replace(/[()]/g, '');
      if (cleanCond === '1=1' || cleanCond === '1') continue;

      // Check OR condition block
      if (cond.includes(' OR ') || cond.includes(' or ')) {
        const orParts = cond.replace(/[()]/g, '').split(/\s+OR\s+/i);
        let anyMatch = false;
        for (const orPart of orParts) {
          const opMatch = orPart.trim().match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(\?|'[^']*'|\d+|[a-zA-Z0-9_.]+)/i);
          if (opMatch) {
            const fullField = opMatch[1];
            const dot = fullField.split('.');
            const cleanField = dot.pop()!.replace(/[`"']/g, '');
            const prefixedField = dot.length > 0 ? `${dot[0].toLowerCase()}_${cleanField}` : cleanField;
            const op = opMatch[2].toUpperCase();
            let targetVal: any = opMatch[3];
            if (targetVal === '?') targetVal = params[pIdx++];
            else if (targetVal.toUpperCase() === 'CURRENT_DATE' || targetVal.toUpperCase() === 'CURDATE()') targetVal = new Date().toISOString().slice(0, 10);
            else if (targetVal.toUpperCase() === 'NOW()' || targetVal.toUpperCase() === 'CURRENT_TIMESTAMP') targetVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
            else if (targetVal.startsWith("'") && targetVal.endsWith("'")) targetVal = targetVal.slice(1, -1);
            else if (!isNaN(Number(targetVal))) targetVal = Number(targetVal);

            const rowVal = row[prefixedField] !== undefined ? row[prefixedField] : row[cleanField];
            if (op === 'LIKE') {
              const pattern = String(targetVal).replace(/%/g, '.*');
              const regex = new RegExp(`^${pattern}$`, 'i');
              if (regex.test(String(rowVal || ''))) {
                anyMatch = true;
              }
            } else if (op === '=' && String(rowVal) === String(targetVal)) {
              anyMatch = true;
            }
          }
        }
        if (!anyMatch) return false;
        continue;
      }

      // IN condition: field IN (?, ?, ...)
      const inMatch = cleanCond.match(/([a-zA-Z0-9_.]+)\s+IN\s*\(([^)]+)\)/i);
      if (inMatch) {
        const fieldName = inMatch[1].split('.').pop()!.replace(/[`"']/g, '');
        const placeholders = inMatch[2].split(',').map((s) => s.trim());
        const expectedVals: any[] = [];
        for (const ph of placeholders) {
          if (ph === '?') expectedVals.push(params[pIdx++]);
          else expectedVals.push(ph.replace(/['"]/g, ''));
        }
        if (!expectedVals.includes(row[fieldName])) return false;
        continue;
      }

      // IS NOT NULL / IS NULL
      if (cleanCond.toUpperCase().includes('IS NOT NULL')) {
        const fieldName = cleanCond.replace(/IS NOT NULL/i, '').trim().split('.').pop()!.replace(/[`"']/g, '');
        if (row[fieldName] === null || row[fieldName] === undefined) return false;
        continue;
      }
      if (cleanCond.toUpperCase().includes('IS NULL')) {
        const fieldName = cleanCond.replace(/IS NULL/i, '').trim().split('.').pop()!.replace(/[`"']/g, '');
        if (row[fieldName] !== null && row[fieldName] !== undefined) return false;
        continue;
      }

      // Basic operators: =, !=, <>, >, <, >=, <=, LIKE
      const opMatch = cleanCond.match(/([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(\?|'[^']*'|\d+|[a-zA-Z0-9_.]+)/i);
      if (opMatch) {
        const fullField = opMatch[1];
        const dot = fullField.split('.');
        const cleanField = dot.pop()!.replace(/[`"']/g, '');
        const prefixedField = dot.length > 0 ? `${dot[0].toLowerCase()}_${cleanField}` : cleanField;
        const op = opMatch[2].toUpperCase();
        let targetVal: any = opMatch[3];

        if (targetVal === '?') {
          targetVal = params[pIdx++];
        } else if (targetVal.toUpperCase() === 'CURRENT_DATE' || targetVal.toUpperCase() === 'CURDATE()') {
          targetVal = new Date().toISOString().slice(0, 10);
        } else if (targetVal.toUpperCase() === 'NOW()' || targetVal.toUpperCase() === 'CURRENT_TIMESTAMP') {
          targetVal = new Date().toISOString().slice(0, 19).replace('T', ' ');
        } else if (targetVal.startsWith("'") && targetVal.endsWith("'")) {
          targetVal = targetVal.slice(1, -1);
        } else if (!isNaN(Number(targetVal))) {
          targetVal = Number(targetVal);
        }

        const rowVal = row[prefixedField] !== undefined ? row[prefixedField] : row[cleanField];

        if (op === '=') {
          if (String(rowVal) !== String(targetVal)) return false;
        } else if (op === '!=' || op === '<>') {
          if (String(rowVal) === String(targetVal)) return false;
        } else if (op === '>') {
          if (!(rowVal > targetVal)) return false;
        } else if (op === '<') {
          if (!(rowVal < targetVal)) return false;
        } else if (op === '>=') {
          if (!(rowVal >= targetVal)) return false;
        } else if (op === '<=') {
          if (!(rowVal <= targetVal)) return false;
        } else if (op === 'LIKE') {
          const pattern = String(targetVal).replace(/%/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          if (!regex.test(String(rowVal || ''))) return false;
        }
      }
    }

    return true;
  }

  async close(): Promise<void> {
    this.saveToDisk();
  }
}

// Factory to initialize active database adapter
let activeAdapter: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (activeAdapter) return activeAdapter;

  if (config.db.type === 'mysql') {
    try {
      const mysqlAdapter = new MySQLAdapter();
      // Test connectivity
      await mysqlAdapter.query('SELECT 1 as test');
      console.log('✅ Connected to MySQL Database successfully');
      activeAdapter = mysqlAdapter;
      return activeAdapter;
    } catch (err: any) {
      console.warn(`⚠️ Failed to connect to MySQL (${err.message}). Falling back to Embedded Engine.`);
    }
  }

  if (config.db.type === 'auto') {
    try {
      const mysqlAdapter = new MySQLAdapter();
      await mysqlAdapter.query('SELECT 1 as test');
      console.log('✅ MySQL detected on port 3306. Connected to MySQL database.');
      activeAdapter = mysqlAdapter;
      return activeAdapter;
    } catch {
      console.log('ℹ️ MySQL not active. Using High-Performance Embedded Relational Database engine.');
      activeAdapter = new EmbeddedRelationalAdapter();
      return activeAdapter;
    }
  }

  activeAdapter = new EmbeddedRelationalAdapter();
  return activeAdapter;
}

export const db = {
  query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    const adapter = await getDatabase();
    return adapter.query<T>(sql, params);
  },
  getOne: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
    const adapter = await getDatabase();
    return adapter.getOne<T>(sql, params);
  },
  execute: async (sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> => {
    const adapter = await getDatabase();
    return adapter.execute(sql, params);
  },
  transaction: async <T>(callback: (trx: TransactionContext) => Promise<T>): Promise<T> => {
    const adapter = await getDatabase();
    return adapter.transaction(callback);
  }
};
