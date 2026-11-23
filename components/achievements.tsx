'use client';

import {useState} from 'react';
import {Check, LockKeyhole} from 'lucide-react';
import {awardsFor} from '../lib/achievements';
import type {Data} from '../lib/data';
import {findGame,games} from '../lib/games';

export function AchievementList({data,compact=false}: {data:Data;compact?:boolean}) {
  const [gameId,setGameId] = useState(data.gameId);
  const game = findGame(gameId);
  const awards = awardsFor(game,data);
  const earned = awards.filter(award=>award.progress>=award.goal).length;
  return <section className={'award-section'+(compact?' award-compact':'')}>
    <header className="section-bar"><div><h2>{compact?'Достижения':'Достижения по играм'}</h2><p>{earned} из {awards.length} открыто</p></div>
      <select aria-label="Игра для достижений" value={game.id} onChange={event=>setGameId(event.target.value)}>{games.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
    </header>
    <div className="award-list">{awards.map(award=>{
      const done = award.progress>=award.goal;
      return <article className="award-row" key={award.title} data-earned={done}>
        <span className="award-icon">{done?<Check size={17}/>:<LockKeyhole size={16}/>}</span>
        <div><h3>{award.title}</h3><p>{award.description}</p></div>
        <span>{done?'Получено':Math.min(award.progress,award.goal).toLocaleString('ru-RU')+' / '+award.goal.toLocaleString('ru-RU')}</span>
      </article>;
    })}</div>
  </section>;
}
