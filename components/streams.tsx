'use client';

import {useEffect, useRef, useState} from 'react';
import Script from 'next/script';
import {ExternalLink, Radio, Tv} from 'lucide-react';
import {findGame, games} from '../lib/games';
import {tournaments, twitchDirectory} from '../lib/twitch';
import {Button} from './button';

type TwitchPlayer = {addEventListener(event: string, listener: () => void): void};
type PlayerConstructor = {
  new (element: string, options: {width: string; height: string; channel: string; autoplay: boolean}): TwitchPlayer;
  ONLINE: string;
  OFFLINE: string;
};
type StreamStatus = 'closed' | 'loading' | 'online' | 'offline' | 'unavailable';

export function Streams({initialGame}: {initialGame: string}) {
  const [gameId, setGameId] = useState(initialGame);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<StreamStatus>('closed');
  const [sdk, setSdk] = useState(false);
  const [inline, setInline] = useState(false);
  const [open, setOpen] = useState(false);
  const playerArea = useRef<HTMLDivElement>(null);
  const game = findGame(gameId);
  const list = tournaments[game.id] ?? [];
  const channel = list.find(item => item.login === selected) ?? list[0];
  const login = channel?.login;

  useEffect(() => {
    const element = playerArea.current;
    if (!element) return;
    const update = () => {
      const supportedOrigin = location.protocol === 'https:' || location.hostname === 'localhost';
      setInline(supportedOrigin && element.clientWidth >= 400);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = playerArea.current;
    if (!element || !open || !inline || !sdk || !login) return;
    const twitch = (window as Window & {Twitch?: {Player: PlayerConstructor}}).Twitch;
    if (!twitch) {setStatus('unavailable'); return;}
    let active = true;
    const host = document.createElement('div');
    host.id = 'skillforge-twitch-player';
    element.append(host);
    const timeout = window.setTimeout(() => {if (active) setStatus('unavailable');}, 14000);
    try {
      const player = new twitch.Player(host.id, {width:'100%', height:'100%', channel:login, autoplay:false});
      const update = (value: StreamStatus) => {
        if (!active) return;
        window.clearTimeout(timeout);
        setStatus(value);
      };
      player.addEventListener(twitch.Player.ONLINE, () => update('online'));
      player.addEventListener(twitch.Player.OFFLINE, () => update('offline'));
    } catch {
      setStatus('unavailable');
    }
    return () => {active = false; window.clearTimeout(timeout); host.remove();};
  }, [inline, login, open, sdk]);

  function resetPlayer() {
    setOpen(false);
    setStatus('closed');
  }

  return <section className="streams-layout">
    <div className="panel streams-picker">
      <div className="panel-head"><div><h2>Выбери игру</h2><p>Турнирные каналы Twitch</p></div><Radio size={21} className="purple"/></div>
      <label className="stream-label">Дисциплина<select value={game.id} onChange={event => {setGameId(event.target.value);setSelected('');resetPlayer();}}>{games.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {list.length > 0 && <div className="channel-list" aria-label="Турнирные каналы">{list.map(item => <button key={item.login} aria-pressed={login === item.login} onClick={() => {if (login !== item.login) {setSelected(item.login);resetPlayer();}}}><Tv size={17}/><span>{item.name}<small>@{item.login}</small></span></button>)}</div>}
      <Button asChild variant="outline"><a href={twitchDirectory(game.id)} target="_blank" rel="noopener noreferrer">Все эфиры игры <ExternalLink size={16}/></a></Button>
    </div>
    <div className="panel streams-player">
      <div className="panel-head"><div><h2>{channel?.name ?? game.name}</h2><p>{channel ? 'Канал на Twitch' : 'Каталог Twitch'}</p></div>{open && inline && status === 'online' && <span className="result loss">В эфире</span>}</div>
      <div className="stream-media" data-open={open && inline && Boolean(channel)}>
        {(!open || !inline || !channel) && <div className="stream-placeholder"><Radio size={32}/><strong>{channel ? 'Смотреть трансляцию' : 'Найти трансляцию по игре'}</strong><p>{!channel ? 'Открой категорию Twitch и проверь, идут ли сейчас турниры.' : inline ? 'Открой плеер, чтобы проверить, идёт ли эфир.' : 'На этом экране трансляция откроется в Twitch.'}</p>
        {channel ? inline ? <Button onClick={() => {setStatus('loading');setOpen(true);}}>Запустить плеер</Button> : <Button asChild><a href={'https://www.twitch.tv/'+login} target="_blank" rel="noopener noreferrer">Смотреть на Twitch <ExternalLink size={16}/></a></Button> : <Button asChild><a href={twitchDirectory(game.id)} target="_blank" rel="noopener noreferrer">Открыть категорию <ExternalLink size={16}/></a></Button>}</div>}
        <div ref={playerArea} className="stream-embed"/>
      </div>
      {open && inline && <><Script src="https://player.twitch.tv/js/embed/v1.js" onReady={() => setSdk(true)} onError={() => setStatus('unavailable')}/><div className="stream-foot"><p role="status">{status==='offline'?'Канал сейчас вне эфира. Выбери другой канал или посмотри записи на Twitch.':status==='unavailable'?'Не удалось открыть плеер здесь. Канал можно открыть в Twitch.': status==='loading'?'Проверяем эфир…':'Источник видео — Twitch.'}</p><Button asChild variant="outline"><a href={'https://www.twitch.tv/'+login} target="_blank" rel="noopener noreferrer">Открыть на Twitch <ExternalLink size={16}/></a></Button></div></>}
    </div>
  </section>;
}
