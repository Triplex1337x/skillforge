'use client';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import { Activity, ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronDown, Crosshair, Gamepad2, History, LayoutDashboard, Menu, Plus, Settings, Sparkles, Target, Trophy, UserRound, X, Zap, Pencil, Trash2, Check, Swords, Gauge, Radio, LogOut } from 'lucide-react';
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Dialog} from 'radix-ui';
import {Button} from '../components/button';
import {Streams} from '../components/streams';
import {AccountGate, GameGate} from '../components/onboarding';
import {AchievementList} from '../components/achievements';
import {currentAccount, signOut} from '../lib/accounts';
import {findGame,games,type GameAdapter} from '../lib/games';
import {coach,dateValue,demoMatches,initial,repository,resultLabels,stats,type Data,type Match,type Result} from '../lib/data';

const navigation = [
  {id:'dashboard',label:'Обзор',icon:LayoutDashboard}, {id:'games',label:'Игры',icon:Gamepad2},
  {id:'matches',label:'История матчей',icon:History}, {id:'analytics',label:'Аналитика',icon:ChartNoAxesCombined},
  {id:'coach',label:'Разбор матчей',icon:Sparkles}, {id:'training',label:'Академия',icon:BookOpen},
  {id:'achievements',label:'Достижения',icon:Trophy}, {id:'streams',label:'Трансляции',icon:Radio}, {id:'profile',label:'Профиль',icon:UserRound},
  {id:'settings',label:'Настройки',icon:Settings}
] as const;
type Screen = typeof navigation[number]['id'];
const descriptions: Record<Screen,string> = {
  dashboard:'', games:'Посмотри свой рейтинг в каждой игре или открой её статистику.',
  matches:'Найди нужный матч, чтобы посмотреть результат или поправить запись.', analytics:'Выбери показатель и период, чтобы увидеть изменения.',
  coach:'Посмотри, что можно улучшить по итогам твоих матчей.', training:'Выбери упражнение и отметь его, когда закончишь.',
  achievements:'Здесь учитываются твои матчи и тренировки.', streams:'', profile:'', settings:''
};
const demo = demoMatches();
const format = (n: number | null, decimals=0) => n === null ? '—' : n.toLocaleString('ru-RU',{maximumFractionDigits:decimals});
const shortDate = (date: string) => new Date(date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
const order = (a: Match,b: Match) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
function currentScreen(): Screen {
  const id = location.hash.slice(1);
  return navigation.find(item => item.id === id)?.id ?? 'dashboard';
}
type Editor = {match?: Match; gameId: string};

export default function App() {
  const [login,setLogin] = useState<string | null | undefined>(undefined);
  useEffect(()=>{try {setLogin(currentAccount());} catch {setLogin(null);}},[]);
  if (login===undefined) return <div className="loading-screen" role="status">SKILLFORGE</div>;
  if (login===null) return <AccountGate onSuccess={setLogin}/>;
  return <Workspace key={login} login={login} onExit={()=>{signOut();setLogin(null);}}/>;
}

function Workspace({login,onExit}:{login:string;onExit:()=>void}) {
  const [data,setData] = useState(initial);
  const [ready,setReady] = useState(false);
  const [message,setMessage] = useState('');
  const [screen,setScreen] = useState<Screen>('dashboard');
  const [mobile,setMobile] = useState(false);
  const [editor,setEditor] = useState<Editor | null>(null);
  const [deleting,setDeleting] = useState<Match | null>(null);
  const [lastDeleted,setLastDeleted] = useState<Match | null>(null);
  const [period,setPeriod] = useState('30');
  const [matchFilter,setMatchFilter] = useState('all');
  const [metric,setMetric] = useState('score');
  const [focusDrill,setFocusDrill] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    repository.load(login).then(value => {if(active) setData(value);}).catch(() => {if(active) setMessage('Локальные данные не удалось прочитать.');}).finally(() => {if(active) setReady(true);});
    const update = () => setScreen(currentScreen());
    update();
    window.addEventListener('hashchange',update);
    return () => {active=false; window.removeEventListener('hashchange',update);};
  },[login]);
  useEffect(() => {
    if (ready) repository.save(login,data).catch(() => setMessage('Изменения не удалось сохранить в браузере.'));
  },[data,login,ready]);
  const game = findGame(data.gameId);
  const isDemo = data.demo;
  const source = isDemo ? demo : data.matches;
  const ownGame = useMemo(() => source.filter(match => match.gameId === game.id).sort(order),[source,game.id]);
  const display = useMemo(() => {
    if (period === 'all') return ownGame;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(period) + 1);
    return ownGame.filter(match => match.date >= dateValue(cutoff));
  },[period,ownGame]);
  const summary = stats(display,game);
  const navigate = (id: Screen) => {
    setScreen(id); location.hash=id; setMobile(false); window.scrollTo({top:0,behavior:'instant'});
  };
  const selectGame = (id: string) => {setData(previous => ({...previous,gameId:id})); setMetric('score'); setFocusDrill(null);};
  function saveMatch(match: Match) {
    setData(previous => ({...previous,demo:false,gameId:match.gameId,matches:[match,...previous.matches.filter(item => item.id !== match.id)]}));
    setMetric('score'); setEditor(null); setMessage('Матч сохранён.');
  }
  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,...data},null,2)],{type:'application/json'}));
    const link = document.createElement('a');
    link.href=url; link.download='skillforge-data.json'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url),1000);
    setMessage('Экспорт локальных данных подготовлен.');
  }
  const showTraining = (index: number) => {setFocusDrill(index); navigate('training');};
  const subtitle = navigation.find(item => item.id===screen)?.label;
  const openEditor = () => setEditor({gameId:game.id});
  if (!ready) return <div className="loading-screen" role="status">SKILLFORGE</div>;
  if (!data.gameId) return <GameGate onExit={onExit} onChoose={id=>{selectGame(id);navigate('dashboard');}}/>;
  return <div className="shell">
    {mobile && <button className="veil" aria-label="Закрыть меню" onClick={() => setMobile(false)}/>}
    <aside className={'sidebar '+(mobile?'open':'')}>
      <a className="brand" href="#dashboard" onClick={event => {event.preventDefault();navigate('dashboard');}}><span className="brand-icon"><Zap fill="currentColor" size={23}/></span><span>SKILL<span>FORGE</span></span></a>
      <nav aria-label="Основное меню">
        <div className="nav-label">ПЛАТФОРМА</div>
        {navigation.slice(0,8).map(({id,label,icon:Icon}) => <a key={id} href={'#'+id} onClick={event => {event.preventDefault();navigate(id);}} aria-current={screen===id?'page':undefined}><Icon size={18}/><span>{label}</span></a>)}
        <div className="nav-label secondary">АККАУНТ</div>
        {navigation.slice(8).map(({id,label,icon:Icon}) => <a key={id} href={'#'+id} onClick={event => {event.preventDefault();navigate(id);}} aria-current={screen===id?'page':undefined}><Icon size={18}/><span>{label}</span></a>)}
      </nav>
      <button className="sign-out" onClick={onExit}><LogOut size={16}/> Выйти</button>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="top-left"><Button variant="ghost" className="mobile-menu icon-button" aria-label={mobile?'Закрыть меню':'Открыть меню'} aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu size={21}/></Button><span className="crumb">Платформа</span><span className="crumb slash">/</span><strong>{subtitle}</strong></div>
        <div className="top-actions">
          <div className="select-wrap game-select"><Gamepad2 size={16}/><select aria-label="Активная игра" value={game.id} onChange={e=>selectGame(e.target.value)}>{games.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14}/></div>
          <button className="avatar" onClick={() => navigate('profile')} aria-label="Открыть профиль">{Array.from(data.name)[0]?.toUpperCase() || 'И'}</button>
        </div>
      </header>
      <main key={screen} className="screen-enter">
        <div className="page-heading"><div><h1>{screen==='dashboard'?'Моя статистика':subtitle}</h1>{descriptions[screen] && <p>{descriptions[screen]}</p>}</div>{['dashboard','matches','analytics'].includes(screen) && <Button onClick={openEditor}><Plus size={18}/> Записать матч</Button>}</div>
        {isDemo && ['dashboard','games','matches','analytics','coach'].includes(screen) && <div className="demo-line"><span>ДЕМО</span><p>Статистика на примере матчей</p><button onClick={() => setData(previous=>({...previous,demo:false}))}>К моим матчам</button></div>}
        {screen==='dashboard' && <>
          {!isDemo && ownGame.length===0 && <section className="panel first-match"><div><h2>Добавь первый матч в {game.name}</h2><p>Для записи достаточно даты и результата. Остальные показатели можно внести позже.</p></div><Button onClick={openEditor}><Plus size={18}/> Записать матч</Button></section>}

          <section className="stat-grid" aria-label="Основные показатели">
            <Stat icon={Swords} title="Матчи за период" value={format(display.length)} detail={game.name} tone="violet"/>
            <Stat icon={Trophy} title="Процент побед" value={summary.winRate===null?'—':format(summary.winRate)+'%'} detail={summary.win+' побед'} tone="mint"/>
            <Stat icon={Crosshair} title={summary.metrics[0].label} value={format(summary.metrics[0].value,1)} detail="В среднем за матч" tone="blue"/>
            <Stat icon={Gauge} title="Рейтинг мастерства" value={format(summary.score)} detail="Из 1 000 баллов" tone="amber"/>
          </section>
          <div className="dashboard-grid">
            <Chart game={game} matches={display} period={period} setPeriod={setPeriod} metric={metric} setMetric={setMetric}/>
            <section className="panel ratings"><div className="panel-head"><div><h2>Рейтинг по играм</h2></div><Trophy className="purple" size={21}/></div>
              {[game,...games.filter(item => item.id!==game.id)].slice(0,3).map(item => <Rating key={item.id} game={item} matches={source} onClick={() => {selectGame(item.id);navigate('analytics');}}/>)}
              <Button variant="ghost" className="all-games" onClick={() => navigate('games')}>Все дисциплины <ArrowRight size={16}/></Button>
            </section>
          </div>
          <section className="panel history-panel"><div className="panel-head"><div><h2>Последние матчи</h2><p>{game.name}</p></div><Button variant="outline" onClick={() => navigate('matches')}>История матчей</Button></div><MatchRows matches={ownGame.slice(0,4)} demo={isDemo} onEdit={match=>setEditor({match,gameId:match.gameId})} onDelete={setDeleting}/></section>
        </>}
        {screen==='streams' && <Streams initialGame={game.id}/>}
        {screen==='games' && <section className="catalog"><header className="section-bar"><h2>Дисциплины</h2><span>Рейтинг / 1000</span></header>{games.map(item=><Rating key={item.id} game={item} matches={source} selected={game.id===item.id} onClick={() => {selectGame(item.id);navigate('analytics');}}/>)}</section>}
        {screen==='matches' && <section className="panel history-panel"><div className="panel-head"><div><h2>{game.name}</h2><p>Всего записей · {ownGame.length}</p></div><label className="filter-label">Результат<select value={matchFilter} onChange={e=>setMatchFilter(e.target.value)}><option value="all">Все</option>{Object.entries(resultLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><MatchRows matches={ownGame.filter(match => matchFilter==='all'||match.result===matchFilter)} demo={isDemo} onEdit={match=>setEditor({match,gameId:match.gameId})} onDelete={setDeleting}/></section>}
        {screen==='analytics' && <><section className="stat-grid"><Stat icon={Gauge} title="Рейтинг мастерства" value={format(summary.score)} detail="Из 1 000 баллов" tone="violet"/>{summary.metrics.map((entry,index)=><Stat key={entry.key} icon={Target} title={entry.label} value={format(entry.value,1)} detail={entry.rate===false?'В среднем за матч':'Ориентир · '+entry.target} tone={['blue','mint','amber'][index%3]}/>)}</section><Chart game={game} matches={display} period={period} setPeriod={setPeriod} metric={metric} setMetric={setMetric}/></>}
        {screen==='coach' && <><div className="panel explanation"><Sparkles size={22}/><div><h2>{game.name}</h2><p>Тренер сравнивает средние показатели матчей с ориентирами игры и проверяет долю побед. Упражнения подобраны по этим правилам.</p></div></div><section className="cards">{coach.recommend(ownGame,game).map(advice => <article className="content-card editorial-row" key={advice.title}><Target className="purple"/><h2>{advice.title}</h2><p>{advice.text}</p><Button variant="outline" onClick={() => showTraining(advice.drill)}>К упражнению</Button></article>)}</section></>}
        {screen==='training' && <section className="cards">{game.drills.map((drill,index)=>{const key=game.id+':'+index; const completed=data.completed[key]; return <article key={key} className={'content-card editorial-row '+(focusDrill===index?'highlight':'')}><BookOpen className="purple"/><div className="muted">{drill.minutes} мин</div><h2>{drill.title}</h2><p>{drill.details}</p><Button aria-pressed={!!completed} variant="outline" onClick={() => setData(previous=>({...previous,completed:{...previous.completed,[key]:!previous.completed[key]}}))}>{completed?<><Check size={16}/> Выполнено</>:'Отметить выполнение'}</Button></article>;})}</section>}
        {screen==='achievements' && <AchievementList key={game.id} data={data}/>}
        {screen==='profile' && <div className='profile-layout'><section className="panel settings-panel"><h2>Личный профиль</h2><p className="profile-login">@{login}</p><form key={data.name+'|'+data.bio} className="form-grid" onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);const name=String(fields.get('name')).trim();if(!name){setMessage('Введи имя профиля.');return;}setData(previous=>({...previous,name,bio:String(fields.get('bio')).trim()}));setMessage('Профиль сохранён.');}}><label>Отображаемое имя<input name="name" required defaultValue={data.name} maxLength={25}/></label><label>О себе<textarea name="bio" defaultValue={data.bio} maxLength={240} rows={4}/></label><Button>Сохранить профиль</Button></form></section><AchievementList key={game.id} data={data} compact/></div>}
        {screen==='settings' && <section className="panel settings-panel"><h2>Данные и отображение</h2><div className="setting"><div><strong>Демонстрационные матчи</strong><p>Переключает источник графиков и рейтинга. Личные записи сохраняются отдельно.</p></div><Button role="switch" aria-label="Демонстрационные матчи" aria-checked={isDemo} variant="outline" onClick={()=>setData(previous=>({...previous,demo:!previous.demo}))}>{isDemo?'Включены':'Выключены'}</Button></div><div className="setting"><div><strong>Экспорт данных</strong><p>Матчи, профиль и отметки о тренировках в файле JSON.</p></div><Button variant="outline" onClick={exportData}><ArrowDownToLine size={17}/> Скачать JSON</Button></div></section>}

      </main>
    </div>
    <div className="mobile-dock" aria-label="Быстрые действия">{([{id:'dashboard',label:'Обзор',icon:LayoutDashboard},{id:'matches',label:'Матчи',icon:History},{id:'streams',label:'Эфиры',icon:Radio}] as const).map(({id,label,icon:Icon})=><a key={id} href={'#'+id} aria-current={screen===id?'page':undefined} onClick={event=>{event.preventDefault();navigate(id);}}><Icon size={19}/><span>{label}</span></a>)}<button onClick={openEditor}><Plus size={20}/><span>Записать</span></button></div>
    {editor && <MatchEditor editor={editor} close={() => setEditor(null)} save={saveMatch}/>}
    <Dialog.Root open={Boolean(deleting)} onOpenChange={open=>{if(!open)setDeleting(null);}}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog"><Dialog.Title>Удалить матч?</Dialog.Title><Dialog.Description>Запись за {deleting && shortDate(deleting.date)} будет удалена из истории и расчётов.</Dialog.Description><div className="dialog-actions"><Dialog.Close asChild><Button variant="outline">Отмена</Button></Dialog.Close><Button onClick={()=>{if(deleting){setData(previous=>({...previous,matches:previous.matches.filter(match=>match.id!==deleting.id)}));setLastDeleted(deleting);setDeleting(null);setMessage('Матч удалён.');}}}>Удалить</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    {message && <div className="toast" role="status">{message}{lastDeleted && message === 'Матч удалён.' && <button className='undo' onClick={()=>{setData(previous=>({...previous,matches:[lastDeleted,...previous.matches]}));setLastDeleted(null);setMessage('Матч восстановлен.');}}>Отменить</button>}<button aria-label="Закрыть уведомление" onClick={() => setMessage('')}><X size={17}/></button></div>}
  </div>;
}

function Stat({icon:Icon,title,value,detail,tone}: {icon:typeof Activity;title:string;value:string;detail:string;tone:string}) {
  return <article className="panel stat"><span className={'stat-icon '+tone}><Icon size={19}/></span><div className="stat-label">{title}</div><strong>{value}</strong><span className="muted">{detail}</span></article>;
}
function Rating({game,matches,onClick,selected}:{game:GameAdapter;matches:Match[];onClick:()=>void;selected?:boolean}) {
  const records=matches.filter(match=>match.gameId===game.id);
  const {score}=stats(records,game);
  return <button className="rating" data-selected={selected} onClick={onClick}><span className="game-mark" style={{color:game.color,backgroundColor:game.color+'19'}}>{game.mark}</span><span className="rating-name"><strong>{game.name}</strong><small>{records.length?'Матчи · '+records.length:'Нет матчей'}</small></span><span className="rating-value">{format(score)}</span><ArrowRight className="rating-arrow" size={16}/></button>;
}
function Chart({game,matches,period,setPeriod,metric,setMetric}:{game:GameAdapter;matches:Match[];period:string;setPeriod:(value:string)=>void;metric:string;setMetric:(value:string)=>void}) {
  const chosen=game.metrics.find(entry=>entry.key===metric);
  const ascending=[...matches].reverse();
  const series=ascending.map((match,index)=>({date:shortDate(match.date),value:chosen?(match.metrics[chosen.key] ?? null):stats(ascending.slice(Math.max(0,index-9),index+1),game).score}));
  return <section className="panel chart-panel">
    <div className="panel-head"><div><h2>График результатов</h2><p>{chosen?.label ?? 'Рейтинг мастерства · до 10 последних матчей'}</p></div><div className="chart-controls"><div className="select-wrap"><CalendarDays size={15}/><select aria-label="Период графика" value={period} onChange={e=>setPeriod(e.target.value)}><option value="7">7 дней</option><option value="30">30 дней</option><option value="all">Всё время</option></select><ChevronDown size={13}/></div></div></div>
    <div className="chart-legend"><span/>{chosen?.label ?? 'Рейтинг мастерства'}<select aria-label="Показатель графика" value={metric} onChange={e=>setMetric(e.target.value)}><option value="score">Рейтинг</option>{game.metrics.map(entry=><option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></div>
    <div className="chart-body">{series.some(point=>point.value!==null)?<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}><AreaChart data={series} margin={{left:-19,right:12,top:12,bottom:0}}><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#945cff" stopOpacity={.44}/><stop offset="100%" stopColor="#945cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#262239" strokeDasharray="4 5"/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill:'#9592a8',fontSize:12}} minTickGap={22}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#9592a8',fontSize:12}} domain={chosen?[0,'auto']:[0,1000]}/><Tooltip contentStyle={{background:'#1a1729',border:'1px solid #3a3051',borderRadius:9,color:'#fff'}} labelStyle={{color:'#eee9fb'}} formatter={value=>[format(Number(value),1),chosen?.label ?? 'Рейтинг']}/><Area type="monotone" dataKey="value" stroke="#a475ff" strokeWidth={3} fill="url(#trend-fill)" dot={series.length===1} activeDot={{r:5}}/></AreaChart></ResponsiveContainer>:<div className="empty"><Activity size={26}/><p>За этот период нет данных для графика.</p></div>}</div>
  </section>;
}
function MatchRows({matches,demo,onEdit,onDelete}:{matches:Match[];demo:boolean;onEdit:(match:Match)=>void;onDelete:(match:Match)=>void}) {
  if(!matches.length)return <div className="empty"><History size={25}/><p>Нет матчей с выбранными параметрами.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Матч</th><th>Дата</th><th>Роль</th>{matches.some(match=>match.metrics.kills!==undefined) && <th>Убийства</th>}<th>Смерти</th><th>Результат</th>{!demo&&<th>Действия</th>}</tr></thead><tbody>{matches.map(match=><tr key={match.id}><td><strong>{match.map || findGame(match.gameId).name}</strong></td><td>{shortDate(match.date)} {match.date.slice(0,4)}</td><td>{match.role}</td>{matches.some(item=>item.metrics.kills!==undefined) && <td>{format(match.metrics.kills ?? null)}</td>}<td>{format(match.metrics.deaths ?? null)}</td><td><span className={'result '+match.result}>{resultLabels[match.result]}</span></td>{!demo&&<td><div className="row-actions"><Button variant="ghost" className="icon-button" aria-label="Редактировать матч" onClick={()=>onEdit(match)}><Pencil size={16}/></Button><Button variant="ghost" className="icon-button" aria-label="Удалить матч" onClick={()=>onDelete(match)}><Trash2 size={16}/></Button></div></td>}</tr>)}</tbody></table></div>;
}
function MatchEditor({editor,close,save}:{editor:Editor;close:()=>void;save:(match:Match)=>void}) {
  const [id,setId]=useState(editor.gameId);
  const game=findGame(id);
  const existing=editor.match?.gameId===id?editor.match:undefined;
  function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields=new FormData(e.currentTarget);
    const metrics:Match['metrics']={};
    for(const entry of game.metrics) {
      const raw=fields.get(entry.key);
      if(raw!==null&&raw!=='')metrics[entry.key]=Number(raw);
    }
    save({id:editor.match?.id ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join(''),gameId:id,date:String(fields.get('date')),role:String(fields.get('role')),map:String(fields.get('map')).trim(),result:fields.get('result') as Result,metrics});
  }
  return <Dialog.Root open onOpenChange={open=>{if(!open)close();}}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog">
    <Dialog.Title>{editor.match?'Редактировать матч':'Добавить матч'}</Dialog.Title><Dialog.Description>Из статистики заполни только то, что знаешь.</Dialog.Description><Dialog.Close asChild><Button variant="ghost" className="dialog-close icon-button" aria-label="Закрыть"><X size={20}/></Button></Dialog.Close>
    <form className="form-grid" onSubmit={submit}><div className="fields"><label>Игра<select value={id} onChange={e=>setId(e.target.value)}>{games.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Дата<input type="date" name="date" min="1900-01-01" max={dateValue()} defaultValue={editor.match?.date ?? dateValue()} required/></label>
    <label key={'role-'+id}>Роль<select name="role" defaultValue={existing?.role}>{game.roles.map(role=><option key={role}>{role}</option>)}</select></label><label>Результат<select name="result" defaultValue={editor.match?.result}>{Object.entries(resultLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    <label>Карта или режим<input name="map" maxLength={60} defaultValue={editor.match?.map}/></label>
    <div className="fields" key={id}>{game.metrics.map(entry=><label key={entry.key}>{entry.label}<input name={entry.key} type="number" min={0} max={entry.max ?? 9999999} step={['deaths','kills','elims','assists','lh','knocks','vision','objectives'].includes(entry.key)?1:'any'} defaultValue={existing?.metrics[entry.key]}/></label>)}</div><div className="dialog-actions"><Dialog.Close asChild><Button type="button" variant="outline">Отмена</Button></Dialog.Close><Button type="submit">Сохранить матч</Button></div></form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
