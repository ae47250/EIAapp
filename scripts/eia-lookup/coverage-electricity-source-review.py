"""Reproduce biomass corroboration from retained source snapshots, without network calls. Run from repository root."""
from pathlib import Path
import json,hashlib
from html.parser import HTMLParser
class Rows(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=None;self.cell=None
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ['td','th'] and self.row is not None:self.cell=[]
 def handle_data(self,s):
  if self.cell is not None:self.cell.append(s)
 def handle_endtag(self,t):
  if t in ['td','th'] and self.cell is not None:self.row.append(' '.join(' '.join(self.cell).split()));self.cell=None
  if t=='tr' and self.row is not None:self.rows.append(self.row);self.row=None
base=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage';source=base/'source-pages/renewable-generation-table-c661b3e3daa4.html'
r=Rows();r.feed(source.read_text())
log=[json.loads(l) for l in Path('evidence/eia-coverage/calls.jsonl').read_text().splitlines()];vs={}
for call in [1420,1421]:
 rec=next(x for x in log if x['id']==call);rows=json.loads((base/'raw'/rec['file']).read_text())['response']['data'];vs[call]={str(x['period']):float(x['generation']) for x in rows}
annual={}
for x in r.rows:
 if len(x)==14 and x[0].isdigit() and x[0] not in annual:annual[x[0]]=x
out=[]
for year,x in annual.items():
 if year not in vs[1420]:continue
 other=float(x[7].replace(',',''));msb=float(x[6].replace(',',''))
 out.append({'year':year,'OB2OtherWasteBiomassMatchesRounded':abs(vs[1420][year]-other)<=.5,'OBWOtherWastePlusBiogenicMSWMatchesRounded':abs(vs[1421][year]-other-msb)<=1.0})
assert len(out)==10 and all(x['OB2OtherWasteBiomassMatchesRounded'] and x['OBWOtherWastePlusBiogenicMSWMatchesRounded'] for x in out),out
p=Path('evidence/eia-coverage/electricity-source-review.json');d=json.loads(p.read_text());d['biomassComponentCorroboration']={'source':'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_1_01_a','localFile':'~/Documents/EIAapp-Evidence/20261029/coverage/source-pages/'+source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'calls':[1420,1421],'annualComparisons':out,'inference':'Same geography, frequency, units and EIA-923 source: OB2 corresponds numerically to Other Waste Biomass; OBW to Other Waste Biomass plus Biogenic Municipal Solid Waste. Both exclude the separately published wood and landfill-gas components of BIO. The exact code meanings are inferred from 10 years of source agreement, not explicitly given by the ambiguous API label. Keep pending until an explicit code-to-component definition is found; do not convert corroboration into proof.'};d['definitionProbes']=[x for x in d['definitionProbes'] if x.get('call')!=1423];d['definitionProbes'].append({'call':1423,'rowTotal':16,'result':'Sector 95 is labelled Coal Consumption but has generation from gas, solar and other fuels. It is not a product filter or a reliable named sector. Remains pending.'});d['metadataConflicts'][3]['resolution']='Technical Notes p.22 explicitly defines sectors 2/3 as independent/non-regulated power producers; browser electric utility wording is wrong. Both remain subsets of electric power.'
p.write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({'biomassYearsCorroborated':len(out),'classification':'pending; exact code semantics not yet documented'}))
