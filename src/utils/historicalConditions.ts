export interface ConditionObservation {
  ts_local: string; tmpf: number | null; dwpf: number | null; relh_pct: number | null;
  skyc1: string | null; wxcodes: string | null; precip_in: number | null;
  avg_wspd_mph: number | null; max_gust_mph: number | null; drct_deg: number | null; vsby_mi: number | null;
}
// Specific phenomena precede generic rain; unknown codes are not clear weather.
export function historicalCondition(sky: string | null, wx: string | null) {
  const code = wx?.trim().toUpperCase() ?? '';
  const phenomena: [string, string][] = [['TS','Thunderstorm'],['FZRA','Freezing Rain'],['FZDZ','Freezing Drizzle'],['PL','Ice Pellets'],['SG','Snow Grains'],['+SN','Heavy Snow'],['-SN','Light Snow'],['SN','Snow'],['GR','Hail'],['GS','Small Hail'],['+RA','Heavy Rain'],['-RA','Light Rain'],['RA','Rain'],['DZ','Drizzle'],['UP','Unknown Precipitation'],['FG','Fog'],['BR','Mist'],['HZ','Haze']];
  for (const [token, label] of phenomena) if (code.includes(token)) return label;
  if (code) return 'Unknown';
  return ({CLR:'Clear',SKC:'Clear',FEW:'Mostly Clear',SCT:'Partly Cloudy',BKN:'Mostly Cloudy',OVC:'Overcast'} as Record<string,string>)[sky?.trim().toUpperCase() ?? ''] ?? 'Unknown';
}
export function parseConditions(data: unknown, date: string): ConditionObservation[] {
  if (!Array.isArray(data)) throw new Error('Invalid historical observations');
  return data.map(value => {
    if (!value || typeof value !== 'object') throw new Error('Invalid historical observation');
    const row = value as Record<string,unknown>;
    if (typeof row.ts_local !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?$/.test(row.ts_local) || row.ts_local.slice(0,10) !== date) throw new Error('Observations do not match selected local date');
    const number = (field: string) => { const v=row[field]; if(v==null)return null; if(typeof v!=='number'||!Number.isFinite(v))throw new Error('Invalid '+field); return v; };
    const text = (field: string) => { const v=row[field];if(v==null)return null;if(typeof v!=='string')throw new Error('Invalid '+field);return v; };
    const result = {ts_local:row.ts_local,tmpf:number('tmpf'),dwpf:number('dwpf'),relh_pct:number('relh_pct'),skyc1:text('skyc1'),wxcodes:text('wxcodes'),precip_in:number('precip_in'),avg_wspd_mph:number('avg_wspd_mph'),max_gust_mph:number('max_gust_mph'),drct_deg:number('drct_deg'),vsby_mi:number('vsby_mi')};
    if(result.relh_pct!=null&&(result.relh_pct<0||result.relh_pct>100))throw new Error('Invalid humidity');
    if(result.precip_in!=null&&result.precip_in<0)throw new Error('Invalid precipitation');
    return result;
  }).sort((a,b)=>a.ts_local.localeCompare(b.ts_local));
}
export function conditionTimeline(rows: ConditionObservation[], date: string) {
  return Array.from({length:24},(_,hour)=>{const prefix=date+'T'+String(hour).padStart(2,'0');const matches=rows.filter(row=>row.ts_local.startsWith(prefix));return matches.length?matches:[{ts_local:prefix+':00:00',missing:true as const}];}).flat();
}
export function conditionBreakdown(rows: ConditionObservation[]) {
  const counts=new Map<string,number>();
  for(const row of rows){const label=historicalCondition(row.skyc1,row.wxcodes);if(label!=='Unknown')counts.set(label,(counts.get(label)??0)+1);}
  const total=Array.from(counts.values()).reduce((a,b)=>a+b,0);
  return Array.from(counts,([condition,count])=>({condition,count,percentage:Math.round(count/total*100)})).sort((a,b)=>b.count-a.count);
}
export function conditionPrecipitation(rows: ConditionObservation[]) {
  const values=rows.map(r=>r.precip_in).filter((v):v is number=>v!=null);
  const measured=values.filter(v=>v!==0.0001).reduce((a,b)=>a+b,0);
  return {amount:values.length?measured:null,trace:values.includes(0.0001),count:values.length};
}
export function historicalNarrative(rows: ConditionObservation[]) {
  if(!rows.length)return 'No observations available.';
  const temps=rows.map(r=>r.tmpf).filter((v):v is number=>v!=null);
  const winds=rows.map(r=>r.avg_wspd_mph).filter((v):v is number=>v!=null);
  const parts=[rows.length+' hourly observations are available; these samples do not establish continuous weather coverage.'];
  const first=rows[0],last=rows[rows.length-1];
  parts.push('First recorded condition: '+historicalCondition(first.skyc1,first.wxcodes)+'. Last recorded condition: '+historicalCondition(last.skyc1,last.wxcodes)+'.');
  // Retain the original story's condition transitions, qualified as samples.
  let transitions = 0;
  for (let index = 1; index < rows.length && transitions < 3; index++) {
    const previous = rows[index - 1], current = rows[index];
    const from = historicalCondition(previous.skyc1, previous.wxcodes);
    const to = historicalCondition(current.skyc1, current.wxcodes);
    if (from !== to && from !== 'Unknown' && to !== 'Unknown') {
      parts.push('Recorded conditions changed from '+from+' at '+previous.ts_local.slice(11,16)+' to '+to+' at '+current.ts_local.slice(11,16)+' station-local time; the exact transition time is unknown.');
      transitions++;
    }
  }
  if(temps.length)parts.push('Recorded temperatures ranged from '+Math.round(Math.min(...temps))+'\u00b0F to '+Math.round(Math.max(...temps))+'\u00b0F.');
  if(winds.length)parts.push('Available wind readings averaged '+Math.round(winds.reduce((a,b)=>a+b,0)/winds.length)+' mph.');
  const precip=conditionPrecipitation(rows);
  if(precip.amount!=null)parts.push('Available hourly precipitation amounts sum to '+precip.amount.toFixed(2)+' inches'+(precip.trace?', with Trace also recorded':'')+'. This is not a completeness claim or a published daily total.');
  return parts.join(' ');
}
export function conditionIsDay(timestamp: string, timezone: string, sunrise?: string | null, sunset?: string | null): boolean | null {
  if (!sunrise || !sunset) return null;
  const seconds = (value: string) => {
    if (/T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
      const [hour, minute, second] = value.slice(11).split(':').map(Number);
      return hour * 3600 + minute * 60 + second;
    }
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit'}).formatToParts(new Date(value));
    const number = (type: string) => Number(parts.find(part => part.type === type)?.value);
    return number('hour') * 3600 + number('minute') * 60 + number('second');
  };
  return seconds(timestamp) >= seconds(sunrise) && seconds(timestamp) < seconds(sunset);
}
