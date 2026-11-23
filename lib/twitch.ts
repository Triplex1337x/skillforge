type Channel = {login: string; name: string};
type ChannelEntry = [login: string, name: string];

function channels(...entries: ChannelEntry[]): Channel[] {
  return entries.map(([login, name]) => ({login, name}));
}

export const tournaments: Record<string, Channel[]> = {
  cs2: channels(['eslcs','ESL Counter-Strike'],['blastpremier','BLAST Premier'],['pgl','PGL']),
  dota: channels(['esl_dota2','ESL Dota 2'],['pgl_dota2','PGL Dota 2']),
  valorant: channels(['valorant','VALORANT Esports'],['valorant_emea','VCT EMEA']),
  standoff: channels(['standoff2esports_ru','Standoff 2 Esports']),
  mlbb: channels(['eslmobile','ESL Mobile']),
  apex: channels(['playapex','Apex Legends Global Series']),
  fortnite: channels(['fortnite','Fortnite Champion Series']),
  pubg: channels(['pubg_battlegrounds','PUBG Esports']),
  ow: channels(['overwatchesports','Overwatch Champions Series']),
  r6: channels(['rainbow6','Rainbow Six Esports']),
  lol: channels(['riotgames','Riot Games'],['lec','LEC'],['lck','LCK'])
};

const categories: Record<string,string> = {
  cs2:'counter-strike', dota:'dota-2', valorant:'valorant', standoff:'standoff-2',
  mlbb:'mobile-legends-bang-bang', apex:'apex-legends', fortnite:'fortnite',
  pubg:'pubg-battlegrounds', ow:'overwatch-2', r6:'tom-clancys-rainbow-six-siege', lol:'league-of-legends'
};
export function twitchDirectory(game: string) {
  return 'https://www.twitch.tv/directory/category/' + categories[game];
}
