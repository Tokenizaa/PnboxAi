import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

/**
 * Cliente DDP Meteor 3.x — implementação fiel da spec:
 * https://github.com/meteor/meteor/blob/devel/packages/ddp/DDP.md
 *
 * Suporta:
 *  - connect / connected / ping / pong / heartbeat
 *  - sub / unsub / nosub / added / changed / removed / ready
 *  - method / result / updated
 *
 * Uso:
 *   const client = new DdpClient({ url: 'wss://pnbox.sebrae.com.br/websocket', cookies: '...' });
 *   await client.connect();
 *   await client.subscribe('segmentacaoMercado.default', [{ idPlano }]);
 *   const result = await client.call('segmentacaoMercado.insert', [payload]);
 *   client.close();
 */

export interface DdpClientOptions {
  url: string;
  cookies?: string;             // Cookie header para enviar no handshake
  headers?: Record<string, string>;
  heartbeatMs?: number;         // default 25s
  timeoutMs?: number;           // timeout de requests default 30s
}

interface DdpPendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  method?: string;
  startedAt: number;
}

interface DdpSubscription {
  resolve: () => void;
  reject: (reason: any) => void;
  ready: boolean;
}

export class DdpClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private opts: Required<DdpClientOptions>;
  private connected = false;
  private sessionId: string | null = null;
  private pendingRequests = new Map<string, DdpPendingRequest>();
  private subscriptions = new Map<string, DdpSubscription>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;

  constructor(opts: DdpClientOptions) {
    super();
    this.opts = {
      url: opts.url,
      cookies: opts.cookies || '',
      headers: opts.headers || {},
      heartbeatMs: opts.heartbeatMs ?? 25000,
      timeoutMs: opts.timeoutMs ?? 30000
    };
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async connect(): Promise<string> {
    if (this.isConnected()) return this.sessionId!;

    return new Promise((resolve, reject) => {
      const wsOptions: any = {
        headers: {
          ...this.opts.headers
        }
      };
      if (this.opts.cookies) {
        wsOptions.headers['Cookie'] = this.opts.cookies;
      }

      this.closedByUser = false;
      this.ws = new WebSocket(this.opts.url, wsOptions);

      const onError = (err: Error) => {
        this.cleanup();
        reject(new Error(`[DDP] falha de conexão: ${err.message}`));
      };

      const onOpen = () => {
        // Enviar mensagem `connect`
        this.sendRaw({
          msg: 'connect',
          version: '1',
          support: ['1', 'pre2', 'pre1']
        });
      };

      const onConnected = (msg: any) => {
        this.connected = true;
        this.sessionId = msg.session;
        this.ws!.removeListener('error', onError);
        this.startHeartbeat();
        resolve(msg.session);
      };

      const onFailed = (msg: any) => {
        this.cleanup();
        reject(new Error(`[DDP] versão rejeitada pelo servidor: ${msg.version}`));
      };

      const onMessage = (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(msg);
        } catch (e: any) {
          this.emit('parseError', e, data.toString().substring(0, 200));
        }
      };

      const onClose = () => {
        const wasConnected = this.connected;
        this.cleanup();
        if (wasConnected && !this.closedByUser) {
          this.emit('disconnect');
        }
      };

      this.ws!.once('open', onOpen);
      this.ws!.once('error', onError);
      this.ws!.once('close', onClose);
      this.ws!.on('message', onMessage);

      // Interceptar mensagem connected/failed
      const origEmit = this.emit.bind(this);
      this.emit = (event: string | symbol, ...args: any[]): boolean => {
        if (event === 'connected') onConnected(args[0]);
        if (event === 'failed') onFailed(args[0]);
        return origEmit(event, ...args);
      };

      // Timeout de conexão
      setTimeout(() => {
        if (!this.connected) {
          onError(new Error('timeout aguardando conexão DDP'));
        }
      }, this.opts.timeoutMs);
    });
  }

  private sendRaw(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('[DDP] websocket não está aberto');
    }
    this.ws.send(JSON.stringify(obj));
  }

  private handleMessage(msg: any) {
    switch (msg.msg) {
      case 'connected':
        this.emit('connected', msg);
        break;
      case 'failed':
        this.emit('failed', msg);
        break;
      case 'ping':
        this.sendRaw({ msg: 'pong', id: msg.id });
        break;
      case 'pong':
        // heartbeat ok
        break;
      case 'result': {
        const req = this.pendingRequests.get(msg.id);
        if (!req) break;
        this.pendingRequests.delete(msg.id);
        if (msg.error) {
          req.reject(new Error(`[DDP method ${req.method}] erro ${msg.error.error}: ${msg.error.reason || msg.error.message || ''}`));
        } else {
          req.resolve(msg.result);
        }
        break;
      }
      case 'updated': {
        // servidor confirmou que escritas foram aplicadas — podemos descartar
        break;
      }
      case 'nosub': {
        const sub = this.subscriptions.get(msg.id);
        if (!sub) break;
        if (msg.error) {
          this.subscriptions.delete(msg.id);
          sub.reject(new Error(`[DDP sub] erro: ${JSON.stringify(msg.error)}`));
        } else {
          this.subscriptions.delete(msg.id);
          sub.resolve();
        }
        break;
      }
      case 'ready': {
        for (const sid of msg.subs || []) {
          const sub = this.subscriptions.get(sid);
          if (sub && !sub.ready) {
            sub.ready = true;
            sub.resolve();
          }
        }
        break;
      }
      case 'added':
      case 'addedBefore':
      case 'changed':
      case 'removed':
      case 'movedBefore':
        this.emit('collection', msg);
        break;
      case 'error':
        this.emit('protocolError', msg);
        break;
      default:
        // unknown — ignorar conforme spec
        break;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendRaw({ msg: 'ping', id: randomUUID() });
      }
    }, this.opts.heartbeatMs);
  }

  /**
   * Chama um método Meteor via DDP e aguarda o resultado.
   */
  async call(method: string, params: any[] = []): Promise<any> {
    if (!this.isConnected()) throw new Error('[DDP] não conectado');

    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`[DDP method ${method}] timeout após ${this.opts.timeoutMs}ms`));
        }
      }, this.opts.timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
        method,
        startedAt
      });

      this.sendRaw({
        msg: 'method',
        id,
        method,
        params
      });
    });
  }

  /**
   * Subscreve em uma publicação. Aguarda `ready` antes de resolver.
   */
  async subscribe(name: string, params: any[] = []): Promise<void> {
    if (!this.isConnected()) throw new Error('[DDP] não conectado');

    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.subscriptions.has(id)) {
          this.subscriptions.delete(id);
          reject(new Error(`[DDP sub ${name}] timeout após ${this.opts.timeoutMs}ms`));
        }
      }, this.opts.timeoutMs);

      const sub: DdpSubscription = {
        resolve: () => { clearTimeout(timeout); resolve(); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
        ready: false
      };
      this.subscriptions.set(id, sub);

      this.sendRaw({
        msg: 'sub',
        id,
        name,
        params
      });
    });
  }

  close() {
    this.closedByUser = true;
    this.cleanup();
  }

  private cleanup() {
    this.connected = false;
    this.sessionId = null;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
      } catch (err: any) {
        console.error('[DDP] cleanup: Failed to close websocket:', err.message, err.stack);
      }
      this.ws = null;
    }
    // rejeitar pendentes
    for (const [id, req] of this.pendingRequests.entries()) {
      req.reject(new Error('[DDP] conexão encerrada'));
    }
    this.pendingRequests.clear();
    for (const [id, sub] of this.subscriptions.entries()) {
      sub.reject(new Error('[DDP] conexão encerrada'));
    }
    this.subscriptions.clear();
  }
}
