import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppData } from '../types';

/**
 * 坚果云 / 任意 WebDAV 网盘同步（国内可用的永久免费方案）。
 * 思路：把整份 AppData 当成一个 JSON 文件传上去，换手机时下载回来覆盖本机。
 * 免费额度：坚果云免费版每月 1GB 上传流量，账本文件只有几十 KB，永远用不完。
 *
 * 注意：坚果云 /dav/ 根目录不允许直接写文件，必须放在「我的坚果云」目录里，
 * 所以这里默认地址已带该目录，并对直接填 /dav/ 的情况做了自动补全。
 */

const KEY_URL = 'cunqian_webdav_url';
const KEY_USER = 'cunqian_webdav_user';
const KEY_PASS = 'cunqian_webdav_pass';

// 坚果云默认根目录（可写位置）
export const DEFAULT_WEBDAV_URL = 'https://dav.jianguoyun.com/dav/我的坚果云/';

/**
 * 可选：预填账号信息。
 * ⚠️ 公开仓库里请保持为空——坚果云应用密码能访问你整个网盘，
 * 一旦提交到公开仓库就等于公开了。需要预填时只改本地打包副本。
 */
export const DEFAULT_WEBDAV_USER = '';
export const DEFAULT_WEBDAV_PASS = '';

const FILE_NAME = 'cunqian-backup.json';

export interface WebdavConfig {
  url: string;
  username: string;
  password: string;
}

// 账号和应用密码都是 ASCII 字符，这里用最朴素的 base64，避免依赖 btoa
const B64CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++) & 0xff;
    const c2 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const c3 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out += B64CHARS[e1] + B64CHARS[e2] + (e3 === 64 ? '=' : B64CHARS[e3]) + (e4 === 64 ? '=' : B64CHARS[e4]);
  }
  return out;
}

function authHeader(cfg: WebdavConfig): string {
  return `Basic ${toBase64(`${cfg.username}:${cfg.password}`)}`;
}

/** 把中文等非 ASCII 路径段做百分号编码，避免原生 fetch 不认 */
function encodePath(p: string): string {
  return p
    .split('/')
    .map((seg) => (/[^\x20-\x7E]/.test(seg) ? encodeURIComponent(seg) : seg))
    .join('/');
}

/** 给出可能的文件地址：正常地址 + 坚果云根目录自动补「我的坚果云」 */
function fileUrls(base: string): string[] {
  let b = base.trim();
  if (!b) b = DEFAULT_WEBDAV_URL;
  if (!b.endsWith('/')) b += '/';
  const urls = [encodePath(b) + FILE_NAME];
  // 用户直接填了 https://dav.jianguoyun.com/dav/ 的情况
  if (/\/dav\/$/i.test(b)) {
    urls.push(encodePath(b + '我的坚果云/') + FILE_NAME);
  }
  return urls;
}

export async function loadConfig(): Promise<WebdavConfig | null> {
  const url = await AsyncStorage.getItem(KEY_URL);
  const username = await AsyncStorage.getItem(KEY_USER);
  const password = await AsyncStorage.getItem(KEY_PASS);
  if (url && username && password) return { url, username, password };
  return null;
}

export async function saveConfig(cfg: WebdavConfig): Promise<void> {
  await AsyncStorage.setItem(KEY_URL, cfg.url.trim());
  await AsyncStorage.setItem(KEY_USER, cfg.username.trim());
  await AsyncStorage.setItem(KEY_PASS, cfg.password.trim());
}

export async function clearConfig(): Promise<void> {
  await AsyncStorage.removeItem(KEY_URL);
  await AsyncStorage.removeItem(KEY_USER);
  await AsyncStorage.removeItem(KEY_PASS);
}

/** 没显式传配置时，自动读本机保存的配置 */
async function resolveConfig(cfg?: WebdavConfig | null): Promise<WebdavConfig | null> {
  if (cfg) return cfg;
  return loadConfig();
}

/** 测试账号密码是否可用 */
export async function testConnection(cfg?: WebdavConfig | null): Promise<string | null> {
  const c = await resolveConfig(cfg);
  if (!c) return '还没填坚果云配置';
  const urls = fileUrls(c.url);
  try {
    // 先试文件本身，再试上级目录，只要认证通过就算成功
    for (const u of urls) {
      const res = await fetch(u, {
        method: 'PROPFIND',
        headers: { Authorization: authHeader(c), Depth: '0' },
      });
      if (res.status === 401) return '账号或应用密码不对（注意不是登录密码，是「应用密码」）';
      if (res.status === 404) continue;
      if (res.status === 207 || res.ok) return null;
    }
    // 目录也 404：可能是路径问题，但认证没报错
    return '认证通过，但目录路径不存在，请检查 WebDAV 地址';
  } catch (e) {
    return `网络连接失败：${String(e)}`;
  }
}

/** 上传整份数据 */
export async function uploadState(data: AppData, cfg?: WebdavConfig | null): Promise<string | null> {
  const c = await resolveConfig(cfg);
  if (!c) return '还没填坚果云配置';
  const payload = JSON.stringify(
    { app: 'cunqian', version: 1, updatedAt: new Date().toISOString(), data },
    null,
    2
  );

  let lastErr = '';
  for (const url of fileUrls(c.url)) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: authHeader(c), 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok || res.status === 201 || res.status === 204) return null;
      if (res.status === 401) return '账号或应用密码不对';
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = String(e);
    }
  }
  return `上传失败（${lastErr}）；坚果云请确认地址是 https://dav.jianguoyun.com/dav/我的坚果云/`;
}

/** 下载并还原 */
export async function downloadState(
  cfg?: WebdavConfig | null
): Promise<{ error: string | null; data: AppData | null; updatedAt?: string }> {
  const c = await resolveConfig(cfg);
  if (!c) return { error: '还没填坚果云配置', data: null };

  let lastErr = '';
  for (const url of fileUrls(c.url)) {
    try {
      const res = await fetch(url, { headers: { Authorization: authHeader(c) } });
      if (res.status === 404) continue;
      if (res.status === 401) return { error: '账号或应用密码不对', data: null };
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      const parsed = JSON.parse(text);
      const d = (parsed?.data ?? parsed) as AppData;
      if (!d || !Array.isArray(d.jobs)) return { error: '云端文件格式不对', data: null };
      return { error: null, data: d, updatedAt: parsed?.updatedAt };
    } catch (e) {
      lastErr = String(e);
    }
  }
  if (lastErr) return { error: `下载失败（${lastErr}）`, data: null };
  return { error: null, data: null }; // 404：云端还没有备份
}
