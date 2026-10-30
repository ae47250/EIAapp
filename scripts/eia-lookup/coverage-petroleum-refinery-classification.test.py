"""Source-based refinery correspondence checks; not independent holdouts."""
import copy,importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('coverage-petroleum-refinery-classification.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Refinery(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.nodes={n['route']:n for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in c.ROUTES};cls.drafts={r:c.build(n) for r,n in cls.nodes.items()}
 def rows(self,name):return self.drafts['petroleum/pnp/'+name]['facets']['series']
 def row(self,name,code):return next(x for x in self.rows(name) if x['sourceDefinition']['id']==code)
 def source(self,name):return {fid:{x['definition']['id']:x['definition'] for x in c.i.inventory('petroleum/pnp/'+name)[fid]} for fid in ['product','process','duoarea','series']}
 def test_headline_operable_capacity(self):
  x=self.row('cap1','8_NA_8D0_NUS_4');self.assertEqual((x['classification'],x['product'],x['activity']),('whole product','petroleum','capacity'));self.assertIn('Operable Atmospheric Crude Oil Distillation',x['basisLabel'])
 def test_operating_idle_not_operable(self):
  for code in ['8DO','8DI']:
   x=c.process(c.PROCESSES[code]);self.assertEqual((x['classification'],x['broaderMeasure']),('subset','8D0'))
 def test_calendar_stream_distinct(self):
  a=self.row('cap1','8_NA_8D0_NUS_4');b=self.row('cap1','8_NA_8D0_NUS_5');self.assertNotEqual(a['unit'],b['unit']);self.assertNotEqual(a['unitBasis'],b['unitBasis']);self.assertIn('no allowance',b['unitBasis'])
 def test_count_not_customers_or_capacity(self):
  xs=[x for x in self.rows('cap1') if x['unit']=='Count'];self.assertEqual(len(xs),147)
  for x in xs:self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_downstream_units_not_total(self):
  for x in self.rows('capchg'):self.assertEqual((x['classification'],x['activity']),('subset','capacity'))
 def test_shared_series_same_decision(self):
  a={x['sourceDefinition']['id']:x for x in self.rows('cap1')}
  for x in self.rows('capchg'):
   y=a[x['sourceDefinition']['id']]
   for field in ['classification','product','activity','unit','capacityBasis']:self.assertEqual(x[field],y[field])
 def test_component_output_capacity_not_production(self):
  x=self.row('capprod','8_NA_8PA_NUS_5');self.assertEqual((x['product'],x['activity'],x['classification']),('petroleum','capacity','subset'))
 def test_petroleum_coke_not_coal(self):
  x=self.row('capprod','8_NA_8PM_NUS_5');self.assertEqual(x['product'],'petroleum')
 def test_hydrogen_sulfur_not_petroleum(self):
  for x in self.rows('capprod'):
   if x['nativeProcess'] in ['8PH','8PS']:self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('product',x)
 def test_storage_volume_not_stock_or_throughput(self):
  for r in ['capwork','capshell']:
   for x in self.rows(r):self.assertEqual((x['activity'],x['capacityBasis'],x['unit']),('capacity','storage volume','Thousand Barrels'));self.assertNotEqual(x['classification'],'whole product')
 def test_storage_basis_and_break_preserved(self):
  a=self.row('capwork','8_NA_8SW0_NUS_MBBL');b=self.row('capshell','8_NA_8SS0_NUS_MBBL');self.assertIn('Working',a['basisLabel']);self.assertIn('Shell',b['basisLabel']);self.assertIn('2011',a['sourcePeriodNote']);self.assertIn('2024',b['sourcePeriodNote'])
 def test_gasoline_crude_storage_components(self):
  a=self.row('capwork','8_NA_8SWC_NUS_MBBL');b=self.row('capshell','8_NA_8SSPG0_NUS_MBBL');self.assertEqual(a['qualifier'],'crude oil');self.assertEqual(b['qualifier'],'gasoline');self.assertEqual(a['qualifierClassification'],'subset');self.assertEqual(b['qualifierClassification'],'subset')
 def test_ethanol_not_whole_biofuel(self):
  x=self.row('capwork','8_NA_8SWOXF_NUS_MBBL');self.assertEqual((x['product'],x['classification']),('biofuels','subset'))
 def test_oxygenate_does_not_imply_biofuel(self):
  x=self.row('capwork','8_NA_8SWOX0_NUS_MBBL');self.assertEqual(x['product'],'petroleum')
 def test_receipts_not_trade(self):
  for x in self.rows('caprec'):self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
  self.assertIn('Foreign',self.row('caprec','8_NA_8R0F_NUS_MBBL')['basisLabel'])
 def test_feed_input_not_capacity_despite_short_name(self):
  self.assertIn('Capacity',c.PROCESSES['YDR']['name'])
  for x in self.rows('dwns'):self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x);self.assertEqual(x['unit'],'Thousand Barrels per Day')
 def test_reference_date_is_not_annual_sum(self):
  for name in ['cap1','capchg','capprod','capwork','capshell']:
   for x in self.rows(name):
    if x.get('activity')=='capacity':self.assertIn('January 1',x['referenceTime'])
 def test_unknown_or_altered_definition_is_pending(self):
  rng=random.Random(20261029)
  for _ in range(100):
   d=copy.deepcopy(rng.choice(list(c.PROCESSES.values())));d['id']='UNKNOWN_'+str(rng.randrange(10**12));self.assertEqual(c.process(d)['classification'],'pending')
  d=copy.deepcopy(c.PROCESSES['8D0']);d['name']='Refinery Utilization';self.assertEqual(c.process(d)['classification'],'pending')
 def test_native_unit_conflict_is_pending(self):
  src=self.source('cap1');d=copy.deepcopy(src['series']['8_NA_8D0_NUS_4']);d['name']=d['name'].replace('Calendar Day','Stream Day');src['series'][d['id']]=d;self.assertEqual(c.series(d,'petroleum/pnp/cap1',src)['classification'],'pending')
 def test_missing_place_never_guessed(self):
  src=self.source('cap1');d=src['series']['8_NA_8D0_NUS_4'];src['duoarea'].pop('NUS');x=c.series(d,'petroleum/pnp/cap1',src);self.assertFalse(x['coverageEligible'])
 def test_changed_whole_scope_is_pending(self):
  src=self.source('cap1');d=copy.deepcopy(src['series']['8_NA_8D0_NUS_4']);d['name']=d['name'].replace('Operable','Idle');src['series'][d['id']]=d;self.assertEqual(c.series(d,'petroleum/pnp/cap1',src)['classification'],'pending')
 def test_all_definitions_and_provenance_preserved(self):
  self.assertEqual(len(self.drafts),7);self.assertEqual(sum(len(d['facets']['series']) for d in self.drafts.values()),4624)
  for route,d in self.drafts.items():
   self.assertTrue(d['complete']);inv=c.i.inventory(route)
   for fid,rows in d['facets'].items():
    self.assertEqual(len(rows),len(inv[fid]))
    for a,b in zip(rows,inv[fid]):self.assertEqual((a['sourceDefinition'],a['frequencies'],a['calls']),(b['definition'],b['frequencies'],b['calls']));self.assertEqual(a['publicationStatus'],'unverified')
if __name__=='__main__':unittest.main()
