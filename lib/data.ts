import {dataKey} from './accounts';
import {games, type GameAdapter} from './games';
export type Result = 'win' | 'loss' | 'draw';
export type Match = {id: string; gameId: string; date: string; role: string; map: string; result: Result; metrics: Record<string, number>};
export type Data = {matches: Match[]; completed: Record<string, boolean>; name: string; bio: string; demo: boolean; gameId: string};
export interface Repository { load(login: string): Promise<Data>; save(login: string, data: Data): Promise<void> }
export const initial: Data = {matches: [], completed: {}, name: 'Игрок', bio: '', demo: true, gameId: 'cs2'};
export const repository: Repository = {
  async load(login) {
    const raw = localStorage.getItem(dataKey(login));
    const defaults = {...initial, name:login, gameId:'', demo:false};
    return raw ? {...defaults, ...JSON.parse(raw)} : defaults;
  },
  async save(login,data) {localStorage.setItem(dataKey(login), JSON.stringify(data));}
};
export const resultLabels = { win: 'Победа', loss: 'Поражение', draw: 'Ничья' };
export const dateValue = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
export function demoMatches(): Match[] {
  return games.flatMap((game, gameIndex) => Array.from({length: gameIndex === 0 ? 12 : gameIndex < 3 ? 7 : 0}, (_, n) => {
    const day = new Date();
    day.setDate(day.getDate() - 2 * n);
    const factor = [1.10,1.17,.90,1.02,1.09,.80,.95,.89,.71,.82,.70,.73][n];
    return {id: 'demo-'+game.id+n, gameId: game.id, date: dateValue(day), role: game.roles[n % game.roles.length], map: game.id === 'cs2' ? ['Mirage','Inferno','Dust II','Ancient'][n%4] : 'Рейтинговый матч', result: n % 3 === 2 ? 'loss' : 'win', metrics: Object.fromEntries(game.metrics.map((metric,i) => [metric.key, metric.key==='deaths' ? 4+n%7 : Math.min(metric.max ?? Infinity,Math.round(metric.target * factor * (1 + ((n+i)%3 - 1)*.11)))]))};
  }));
}
export const average = (values: number[]) => values.length ? values.reduce((sum, x) => sum+x,0)/values.length : null;
export function stats(matches: Match[], game: GameAdapter) {
  const win = matches.filter(match => match.result === 'win').length;
  const winRate = matches.length ? 100 * win / matches.length : null;
  const metrics = game.metrics.map(metric => ({...metric, value: average(matches.flatMap(match => match.metrics[metric.key] === undefined ? [] : [match.metrics[metric.key]]))}));
  const normalized = average(metrics.flatMap(metric => metric.value === null || metric.rate===false ? [] : [Math.min(1,metric.value / metric.target)]));
  const resultScore = average(matches.map(match => match.result === 'win' ? 1 : match.result === 'draw' ? .5 : 0));
  const score = normalized === null || resultScore === null ? null : Math.round(1000 * (.75 * normalized + .25 * resultScore));
  return {win,winRate,metrics,score};
}
export type Advice = {title: string; text: string; drill: DrillLink};
type DrillLink = number;
export interface CoachProvider { recommend(matches: Match[], game: GameAdapter): Advice[] }
export const coach: CoachProvider = {
  recommend(matches, game) {
    if (!matches.length) return [{title:'Собери базу',text:'Добавь матч, чтобы получить рекомендации по своим показателям.',drill:0}];
    const snapshot = stats(matches,game);
    const advice = snapshot.metrics.flatMap((metric,index) => metric.rate!==false && metric.value !== null && metric.value < metric.target ? [{title:metric.label,text:`Среднее ${metric.value.toFixed(1)} при ориентире ${metric.target}. После упражнения сравни показатель в следующих матчах.`,drill:index % game.drills.length}] : []);
    if ((snapshot.winRate ?? 0) < 50) advice.push({title:'Разбор поражений',text:'Побед меньше половины. Выбери недавнее поражение и выпиши два решения, которые можно проверить в следующей игре.',drill:1});
    return advice.length ? advice : [{title:'Закрепи результат',text:'Все показатели достигли заданных ориентиров. Повтори базовое упражнение и проверь стабильность на новых матчах.',drill:0}];
  }
};
