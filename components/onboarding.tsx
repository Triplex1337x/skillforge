'use client';

import {useState, type FormEvent} from 'react';
import {ArrowRight, Check, LogOut, Search, Zap} from 'lucide-react';
import {authenticate} from '../lib/accounts';
import {games} from '../lib/games';
import {Button} from './button';

export function GamePicker({value, onChange}: {value:string; onChange:(id:string)=>void}) {
  const [query,setQuery] = useState('');
  const visible = games.filter(game => (game.name+' '+game.mark).toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="game-picker">
    <label className="game-search"><Search size={17}/><input aria-label="Поиск игры" placeholder="Найти игру" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <div className="picker-list" role="radiogroup" aria-label="Игры">
      {visible.map(game => <label className="picker-option" key={game.id}>
        <input type="radio" name="selected-game" value={game.id} checked={value===game.id} onChange={()=>onChange(game.id)}/>
        <span className="game-mark" style={{color:game.color}}>{game.mark}</span>
        <strong>{game.name}</strong>{value===game.id && <Check size={18}/>}
      </label>)}
      {visible.length===0 && <p role="status">Игра не найдена.</p>}
    </div>
  </div>;
}

export function AccountGate({onSuccess}: {onSuccess:(login:string)=>void}) {
  const [signIn,setSignIn] = useState(false);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const login = await authenticate(String(fields.get('login')), String(fields.get('password')), signIn ? undefined : String(fields.get('confirmation')));
      onSuccess(login);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось открыть профиль.');
    } finally { setBusy(false); }
  }
  return <div className="gate">
    <div className="gate-art" style={{backgroundImage: "linear-gradient(180deg,#100e1a35,#100e1aa0),url(" + (process.env.NEXT_PUBLIC_SKILLFORGE_BASE_PATH ?? "") + "/forge-hero.webp)"}}><div className="brand"><span className="brand-icon"><Zap size={21}/></span>SKILLFORGE</div></div>
    <div className="gate-body">
      <div className="gate-form">
        <h1>{signIn?'Вход':'Регистрация'}</h1>
        <p>Профиль и статистика сохраняются в этом браузере.</p>
        <form className="form-grid" onSubmit={submit}>
          <label>Логин<input name="login" autoComplete="username" autoCapitalize="none" required minLength={3} maxLength={25}/></label>
          <label>Пароль<input name="password" type="password" autoComplete={signIn?'current-password':'new-password'} required minLength={8} maxLength={128} placeholder={signIn?undefined:'От 8 знаков'}/></label>
          {!signIn && <label>Повтори пароль<input name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button disabled={busy} type="submit">{busy?'Подождите…':signIn?'Войти':'Создать профиль'}<ArrowRight size={17}/></Button>
        </form>
        <button className="text-action" disabled={busy} onClick={()=>{setSignIn(!signIn);setError('');}}>{signIn?'Создать профиль':'Уже есть профиль? Войти'}</button>
      </div>
    </div>
  </div>;
}

export function GameGate({onChoose,onExit}: {onChoose:(id:string)=>void;onExit:()=>void}) {
  const [value,setValue] = useState('');
  return <div className="gate game-gate">
    <section className="gate-form">
      <div className="gate-heading"><div><h1>Выбери свою игру</h1><p>Её статистика откроется первой. Игру можно сменить в любой момент.</p></div><Button variant="ghost" onClick={onExit} aria-label="Выйти"><LogOut size={18}/></Button></div>
      <GamePicker value={value} onChange={setValue}/>
      <Button disabled={!value} onClick={()=>onChoose(value)}>Продолжить <ArrowRight size={17}/></Button>
    </section>
  </div>;
}
