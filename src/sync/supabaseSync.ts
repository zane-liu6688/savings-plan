import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';

/**
 * 云同步层（Supabase）。
 * 内置默认服务配置：用户开箱即用，不需要手动填写 URL / Key。
 * 数据表用 app_state_cn，与澳洲版的 app_state 完全隔离，互不干扰。
 */

// 内置云同步服务（留空 = 不内置任何服务，请使用者在设置页填自己的 Supabase 项目）
// 提示：Supabase 的 publishable key 设计上可放客户端，但这里仍不预置任何真实项目，避免占用他人额度。
export const DEFAULT_SUPABASE_URL = '';
export const DEFAULT_SUPABASE_KEY = '';

const TABLE = 'app_state_cn';

const KEY_URL = 'cunqian_supabase_url';
const KEY_ANON = 'cunqian_supabase_key';
const KEY_UID = 'cunqian_supabase_uid';
const KEY_EMAIL = 'cunqian_supabase_email';

let client: SupabaseClient | null = null;

// RN 环境没有 localStorage，用 AsyncStorage 存 Supabase 会话
const authStorage = {
  getItem: (k: string) => AsyncStorage.getItem(k),
  setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
  removeItem: (k: string) => AsyncStorage.removeItem(k),
};

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

async function ensureClient(): Promise<SupabaseClient> {
  if (client) return client;
  const url = (await AsyncStorage.getItem(KEY_URL)) || DEFAULT_SUPABASE_URL;
  const key = (await AsyncStorage.getItem(KEY_ANON)) || DEFAULT_SUPABASE_KEY;
  client = makeClient(url, key);
  return client;
}

/** 返回当前生效的配置（未自定义时即内置默认值） */
export async function loadConfig(): Promise<{ url: string; anonKey: string; isDefault: boolean }> {
  const savedUrl = await AsyncStorage.getItem(KEY_URL);
  const savedKey = await AsyncStorage.getItem(KEY_ANON);
  await ensureClient();
  return {
    url: savedUrl || DEFAULT_SUPABASE_URL,
    anonKey: savedKey || DEFAULT_SUPABASE_KEY,
    isDefault: !(savedUrl && savedKey),
  };
}

/** 保存自定义配置（覆盖内置默认值） */
export async function configure(url: string, anonKey: string): Promise<void> {
  client = makeClient(url.trim(), anonKey.trim());
  await AsyncStorage.setItem(KEY_URL, url.trim());
  await AsyncStorage.setItem(KEY_ANON, anonKey.trim());
}

/** 恢复为内置默认配置 */
export async function resetConfig(): Promise<void> {
  client = null;
  await AsyncStorage.removeItem(KEY_URL);
  await AsyncStorage.removeItem(KEY_ANON);
}

export async function getSessionEmail(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_EMAIL);
}

export async function signUp(email: string, password: string): Promise<string | null> {
  const c = await ensureClient();
  const { data, error } = await c.auth.signUp({ email, password });
  if (error) return translate(error.message);
  if (data.user) {
    await AsyncStorage.setItem(KEY_UID, data.user.id);
    await AsyncStorage.setItem(KEY_EMAIL, email);
  }
  return null;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const c = await ensureClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) return translate(error.message);
  if (data.user) {
    await AsyncStorage.setItem(KEY_UID, data.user.id);
    await AsyncStorage.setItem(KEY_EMAIL, email);
  }
  return null;
}

export async function signOut(): Promise<void> {
  const c = await ensureClient();
  await c.auth.signOut();
  await AsyncStorage.removeItem(KEY_UID);
  await AsyncStorage.removeItem(KEY_EMAIL);
}

async function getUid(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_UID);
}

export async function pushState(data: AppData): Promise<string | null> {
  const c = await ensureClient();
  const uid = await getUid();
  if (!uid) return '请先登录账号';
  const { error } = await c
    .from(TABLE)
    .upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
  return error ? translate(error.message) : null;
}

export async function pullState(): Promise<{ error: string | null; data: AppData | null }> {
  const c = await ensureClient();
  const uid = await getUid();
  if (!uid) return { error: '请先登录账号', data: null };
  const { data, error } = await c.from(TABLE).select('data').eq('user_id', uid).single();
  if (error) return { error: translate(error.message), data: null };
  return { error: null, data: (data?.data as AppData) ?? null };
}

/** 把常见英文报错转成中文提示 */
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (m.includes('already registered') || m.includes('user already')) return '该邮箱已注册，请直接登录';
  if (m.includes('password should be at least')) return '密码太短，至少要 6 位';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return '邮箱格式不正确';
  if (m.includes('network') || m.includes('fetch')) return '网络连接失败，请检查手机网络后重试';
  if (m.includes('does not exist') || m.includes('relation')) return '云端数据表未创建，请联系开发者初始化';
  if (m.includes('email not confirmed')) return '邮箱未验证，请先去邮箱点确认链接';
  if (m.includes('row-level security') || m.includes('permission denied')) return '云端权限不足，请确认已登录';
  return msg;
}
