import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface DatabaseSkillConfig {
  supabaseUrl?: string;
  supabaseKey?: string;
  localStorePath?: string;
}

export interface StoredRecord {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

/**
 * DatabaseSkill - Fornece persistência real de dados para todos os Agents.
 * Conecta ao Supabase quando as credenciais estiverem disponíveis,
 * ou a uma base local persistente em disco (.data/pnbox_store.json)
 * garantindo que nenhum dado seja perdido entre reinicializações do servidor.
 */
export class DatabaseSkill {
  private supabase: SupabaseClient | null = null;
  private localStorePath: string;
  private localTables: Map<string, Map<string, StoredRecord>> = new Map();

  constructor(config?: DatabaseSkillConfig) {
    const url = config?.supabaseUrl || process.env.SUPABASE_URL;
    const key = config?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key && url.startsWith('http')) {
      try {
        this.supabase = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
      } catch (err) {
        console.warn('[DatabaseSkill] Falha ao inicializar cliente Supabase:', err);
      }
    }

    this.localStorePath = config?.localStorePath || path.join(process.cwd(), '.data', 'pnbox_store.json');
    this.loadLocalStore();
  }

  private loadLocalStore(): void {
    try {
      const dir = path.dirname(this.localStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.localStorePath)) {
        const raw = fs.readFileSync(this.localStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [table, records] of Object.entries(parsed)) {
          const map = new Map<string, StoredRecord>();
          for (const [id, rec] of Object.entries(records as Record<string, StoredRecord>)) {
            map.set(id, rec);
          }
          this.localTables.set(table, map);
        }
      }
    } catch (err) {
      console.warn('[DatabaseSkill] Erro ao carregar banco local:', err);
    }
  }

  private saveLocalStore(): void {
    try {
      const dir = path.dirname(this.localStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, Record<string, StoredRecord>> = {};
      for (const [table, map] of this.localTables.entries()) {
        serializable[table] = {};
        for (const [id, rec] of map.entries()) {
          serializable[table][id] = rec;
        }
      }
      fs.writeFileSync(this.localStorePath, JSON.stringify(serializable, null, 2), 'utf8');
    } catch (err) {
      console.warn('[DatabaseSkill] Erro ao salvar banco local:', err);
    }
  }

  /**
   * Salva ou atualiza um registro garantindo vínculo com userId
   */
  public async insert<T extends StoredRecord>(table: string, record: T): Promise<T> {
    if (!record.userId) {
      throw new Error(`[DatabaseSkill] Tentativa de inserir registro na tabela '${table}' sem userId associado.`);
    }

    const now = new Date().toISOString();
    const prepared: T = {
      ...record,
      createdAt: record.createdAt || now,
      updatedAt: now,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from(table)
        .upsert(prepared as any)
        .select()
        .single();

      if (error) {
        console.warn(`[DatabaseSkill] Erro Supabase ao salvar em ${table}: ${error.message}. Salvando em fallback local.`);
      } else if (data) {
        return data as T;
      }
    }

    // Fallback persistente local
    if (!this.localTables.has(table)) {
      this.localTables.set(table, new Map());
    }
    this.localTables.get(table)!.set(prepared.id, prepared);
    this.saveLocalStore();
    return prepared;
  }

  /**
   * Busca registros por userId
   */
  public async findByUserId<T extends StoredRecord>(table: string, userId: string): Promise<T[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        return data as T[];
      }
    }

    const tableMap = this.localTables.get(table);
    if (!tableMap) return [];
    return Array.from(tableMap.values()).filter((r) => r.userId === userId) as T[];
  }

  /**
   * Busca registro por ID
   */
  public async findById<T extends StoredRecord>(table: string, id: string): Promise<T | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as T;
      }
    }

    const tableMap = this.localTables.get(table);
    if (!tableMap) return null;
    return (tableMap.get(id) as T) || null;
  }

  /**
   * Atualiza registro específico
   */
  public async update<T extends StoredRecord>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.findById<T>(table, id);
    if (!existing) return null;

    const merged: T = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return await this.insert<T>(table, merged);
  }

  /**
   * Remove registro por ID
   */
  public async delete(table: string, id: string): Promise<boolean> {
    if (this.supabase) {
      await this.supabase.from(table).delete().eq('id', id);
    }
    const tableMap = this.localTables.get(table);
    if (tableMap && tableMap.has(id)) {
      tableMap.delete(id);
      this.saveLocalStore();
      return true;
    }
    return false;
  }
}

export const databaseSkill = new DatabaseSkill();
