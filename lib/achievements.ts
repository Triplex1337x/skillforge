import type {Data, Match} from './data';
import type {GameAdapter} from './games';

type Award = {title:string; goal:number; progress:number; description:string};
type Milestone = [title:string,key:string,goal:number];
const milestones: Record<string,Milestone[]> = {
  cs2:[['Первый контакт','kills',25],['Темп раунда','adr',100],['Точность','hs',65]],
  dota:[['Удар по экономике','gpm',650],['Мастер добиваний','lh',220],['Двойная пятёрка','kills',10]],
  valorant:[['Решающее влияние','acs',280],['В каждом раунде','kast',80],['Двадцать пять','kills',25]],
  standoff:[['Чистый выстрел','hs',60],['Сыгранная команда','assists',10],['Под давлением','kills',25]],
  mlbb:[['Темп фарма','gold',800],['Давление в бою','damage',60000],['Командный бой','assists',18]],
  apex:[['Мастер нокдаунов','knocks',8],['Тысяча урона','damage',1000],['Охотник','kills',6]],
  fortnite:[['Шесть устранений','kills',6],['Меткий стрелок','accuracy',45],['Серьёзный урон','damage',1000]],
  pubg:[['До финального круга','survival',25],['Боевой опыт','damage',600],['Пять фрагов','kills',5]],
  ow:[['Командный вклад','assists',15],['Щит команды','mitigation',9000],['Серия ликвидаций','elims',27]],
  r6:[['Контроль точки','objectives',2],['Опора команды','assists',5],['Прорыв','kills',9]],
  lol:[['Ритм линии','cs',8],['Карта под контролем','vision',40],['Участие в бою','kp',75]]
};

export function awardsFor(game: GameAdapter, data: Data): Award[] {
  const matches: Match[] = data.matches.filter(match => match.gameId === game.id);
  return [
    {title:'Первый матч',description:'Запиши матч в этой игре.',goal:1,progress:matches.length},
    {title:'Три победы',description:'Запиши три победы в этой игре.',goal:3,progress:matches.filter(match=>match.result==='win').length},
    {title:'Практика',description:'Выполни все упражнения по игре.',goal:game.drills.length,progress:game.drills.filter((_,index)=>data.completed[game.id+':'+index]).length},
    ...(milestones[game.id] ?? []).map(([title,key,goal])=>{
      const name = game.metrics.find(metric=>metric.key===key)?.label ?? key;
      return {title,goal,description:name+' · '+goal+' за один матч',progress:Math.max(0,...matches.map(match=>match.metrics[key] ?? 0))};
    })
  ];
}
