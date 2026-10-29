"""Reproduce generation source review from retained EIA snapshots; no network calls."""
import hashlib,json,re
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[2]
e=root/'evidence/eia-coverage'; sources=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/source-pages'
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
p=Rows();p.feed((sources/'small-scale-state-table-e3ed49dc0c9c.html').read_text())
g=json.loads((root/'data/eia/routing-metadata.json').read_text())['geographies'];names={r['name']:r['code'] for r in g if r['type']=='state'};names['U.S. Total']='USA'
assert p.rows[4][3]=='Estimated Small Scale Generation'
assert p.rows[5][6:8]==['August 2026','August 2025']
rows=[r for r in p.rows if len(r)==26 and r[0] in names];assert len(rows)==52
places=[{'code':names[r[0]],'name':r[0],'placeKind':'US' if names[r[0]]=='USA' else 'state','publishedSmallScalePVColumn':True,'sampleStatuses':['numeric' if re.fullmatch(r'[\d,]+(?:\.\d+)?',v) else v for v in r[6:8]]} for r in rows]
assert len({p['code'] for p in places})==52
config=json.loads((sources/'electricity-browser-config-6b663bfa3cd4.json').read_text())
def walk(x):
 if isinstance(x,dict):
  if 'filterValue' in x:yield x
  else:
   for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
defs=[r for r in walk(config['filterGroups']) if r.get('filterGroupId')==26 and r.get('filterValue') in ['ALL','AOR','SUN','BIO','TSN','DPV']]
urls={'small-scale-state-table-e3ed49dc0c9c.html':'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_1_17_a','electricity-browser-config-6b663bfa3cd4.json':'https://www.eia.gov/electricity/data/browser/data/index.php?method=getConfigJSON','electricity-browser-911b21487630.html':'https://www.eia.gov/electricity/data/browser/','electricity-browser-main.js':'https://www.eia.gov/electricity/data/browser/main.js?v=1.20'}
record={
 'status':'Source-scope review; not a coverage table or complete availability check.',
 'method':'UNSD correspondence table / SKOS whole versus narrower concept; owner-approved generation facility-size basis. See DESIGN.md for benchmark applicability.',
 'ownerDecision':'Prefer published all-size total; accept labelled utility-scale headline total only where all-size total is not published. Warn when a published small-scale estimate is omitted.',
 'labels':{'utilityScale':'utility-scale (1 MW and larger)','omittedSmallScale':'excludes small-scale (e.g. rooftop) generation'},
 'sourceFiles':[{'url':url,'localFile':'~/Documents/EIAapp-Evidence/20261029/coverage/source-pages/'+name,'sha256':hashlib.sha256((sources/name).read_bytes()).hexdigest()} for name,url in urls.items()],
 'documentation':[
  {'url':'https://www.eia.gov/electricity/data/eia861m/','finding':'Small-scale PV capacity and generation estimates are published. Other-technology net-metering capacity/customer/surplus-sales data are not total generation estimates.'},
  {'url':'https://www.eia.gov/totalenergy/data/monthly/pdf/sec7_n.pdf','finding':'Section 7 generation covers utility-scale facilities at least 1 MW; small-scale is excluded. Small-scale solar PV is in Table 10.6.'},
  {'url':'https://www.eia.gov/totalenergy/data/monthly/pdf/sec10_12.pdf','finding':'Solar table separately publishes small-scale PV, utility-scale PV and thermal, and their combined solar total for 50 states and DC.'},
  {'url':'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_1_01','finding':'All-fuels utility-scale total and separate total-solar, total-PV and small-PV measures. Do not calculate an all-size all-fuels total without authorization.'}],
 'smallScaleEstimate':{'fuel':'solar photovoltaic','wholeProduct':'solar','alsoComponentOf':['renewable','electricity'],'sectors':['residential','commercial','industrial'],'placeVerification':'Exact state names matched to routing metadata; table rows have 26 cells; columns 6 and 7 are small-scale August 2026 and August 2025. No observation values stored here.','places':places,'counts':{'US':1,'statesIncludingDC':51,'numericInSample':51,'symbolOnlyInSample':1},'limitation':'A published estimate column does not imply a numeric value in every period; Alabama has NM in both sampled columns. No country/World inference. B1 must establish actual period coverage.'},
 'notation':{'NM':{'meaning':'Not meaningful due to large relative standard error or excessive percentage change.','source':'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_1_17_a','handling':'Nonnumeric; never zero. Publication of a column is distinct from a usable observation.'}},
 'fuelSearchScope':'All 154 FITS-route measure inventories and EIA EPM / EIA-861M documentation: small-scale generation estimates found for solar PV. Other technologies have small-installation capacity records, which cannot prove generation estimates. This is bounded evidence, not a claim that no other source publication exists.',
 'nativeBrowserDefinitions':defs,
 'metadataConflicts':[
  {'code':'AOR','apiLabel':'all renewables','officialBrowserMeaning':'other renewables, excluding hydroelectric dams','decision':'Subset of renewable; use whole renewable candidate only after full definition verification.'},
  {'code':'DPV','conflict':'Browser notes copy a generic solar including thermal description, while its name, tree and EIA-861M survey explicitly identify small-scale PV.','decision':'Use specific documented PV definition; not total solar.'},
  {'code':'SOETPUS','conflict':'All Sectors in title does not mean all facility sizes.','decision':'Utility-scale. Prefer combined SOTEPUS for matched place/sector/frequency where published.'},
  {'codes':['BIO','OB2','OBW'],'conflict':'API labels all say biomass despite differing measures.','decision':'BIO is documented total wood plus other biomass. OB2 and OBW remain unaccepted until their components are verified.'}],
 'definitionProbes':{'calls':[1418,1419],'period':'2024','purpose':'Same-period source-definition cross-check, not B1. Arithmetic agreement corroborates documented definitions but does not alone prove semantics.','comparisons':[]},
 'frozenResearchExpectationsBeforeClassifierEdit':[
  'SOTEPUS is all-size solar; prefer it over utility-scale solar when available for the requested dimensions.',
  'SOETPUS and SOT5PUS are utility-scale solar and carry both size and small-scale exclusion labels.',
  'Utility-scale solar commercial/industrial/electric-power entries stay subsets of all sectors; may qualify in their own whole-sector cell subject to preferred all-size availability.',
  'Small-scale-only PV remains a subset of solar; PV-only and thermal-only remain product subsets even when facility-size totals are complete.',
  'ELETPUS includes solar and omits published small-scale PV, so it carries the exclusion notice. Electric-power-sector generation does not inherit residential/commercial/industrial small-PV notice.',
  'NGETPUS is utility-scale with no solar exclusion notice. Facility-size approval does not relax consumption, capacity, technology, sector or product-component restrictions.'
 ]}
log=[json.loads(x) for x in (e/'calls.jsonl').read_text().splitlines()]
raw=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/raw'
rs={c['id']:json.loads((raw/c['file']).read_text())['response']['data'] for c in log if c['id'] in [1418,1419]}
v={r['fueltypeid']:float(r['generation']) for r in rs[1418]};m={r['msn']:float(r['value']) for r in rs[1419]}
for title,delta,tol in [('TSN = SUN + DPV',v['TSN']-v['SUN']-v['DPV'],0.0001),('TPV = SPV + DPV',v['TPV']-v['SPV']-v['DPV'],0.0001),('REN = AOR + HYC',v['REN']-v['AOR']-v['HYC'],0.0001),('MER SOETPUS = SOT5PUS = electricity SUN',max(abs(m['SOETPUS']-m['SOT5PUS']),abs(m['SOT5PUS']-v['SUN'])),0.001),('MER SOTEPUS = electricity TSN',m['SOTEPUS']-v['TSN'],0.001)]:
 assert abs(delta)<=tol,title
 record['definitionProbes']['comparisons'].append({'relationship':title,'agreesWithinRounding':True,'absoluteTolerance':tol})
(e/'generation-scope-review.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'places':len(places),'definitionComparisons':len(record['definitionProbes']['comparisons']),'written':'generation-scope-review.json'}))
