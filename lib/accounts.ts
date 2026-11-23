import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js';

type Credentials = {login: string; salt: string; verifier: string};
const activeKey = 'skillforge-active-account';
const prefix = 'skillforge-account:';
export const accountKey = (login: string) => prefix + login.toLocaleLowerCase('ru-RU');
export const dataKey = (login: string) => accountKey(login) + ':data';

export function currentAccount(): string | null {
  const login = localStorage.getItem(activeKey);
  return login && localStorage.getItem(accountKey(login)) ? login : null;
}
export function signOut() { localStorage.removeItem(activeKey); }

async function passwordVerifier(password: string, salt: string) {
  return bytesToHex(await pbkdf2Async(sha256, password, hexToBytes(salt), {c:600000, dkLen:32}));
}

export async function authenticate(rawLogin: string, password: string, confirmation?: string) {
  const login = rawLogin.trim();
  const key = accountKey(login);
  const existing = localStorage.getItem(key);
  if (confirmation !== undefined) {
    if (!/^[\p{L}\p{N}_.-]{3,25}$/u.test(login)) throw new Error('Логин должен содержать от 3 до 25 знаков. Подойдут буквы, цифры, точка, дефис и подчёркивание.');
    if (password.length < 8 || password.length > 128) throw new Error('Пароль должен содержать от 8 до 128 знаков.');
    if (password !== confirmation) throw new Error('Пароли не совпадают.');
    if (existing) throw new Error('Такой логин уже есть в этом браузере.');
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const verifier = await passwordVerifier(password,salt);
    if (localStorage.getItem(key)) throw new Error('Такой логин уже есть в этом браузере.');
    const legacy = localStorage.getItem('skillforge-v1');
    if (legacy && !localStorage.getItem('skillforge-legacy-claimed')) {
      try {
        const old = JSON.parse(legacy);
        localStorage.setItem(dataKey(login), JSON.stringify({...old, gameId:'', demo:false}));
        localStorage.setItem('skillforge-legacy-claimed','1');
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    localStorage.setItem(key,JSON.stringify({login,salt,verifier} satisfies Credentials));
    localStorage.setItem(activeKey,login);
    return login;
  }
  if (!existing) throw new Error('Проверь логин и пароль.');
  const record = JSON.parse(existing) as Credentials;
  if (await passwordVerifier(password,record.salt) !== record.verifier) throw new Error('Проверь логин и пароль.');
  localStorage.setItem(activeKey,record.login);
  return record.login;
}
