"""Source-based summary/refining regressions; no independent benchmark claim."""
import copy,importlib.util,json,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('c',Path(__file__).with_name('coverage-petroleum-summary-classification.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Summary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.drafts={n['route']:c.build(n) for n in c.i.read(c.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in c.ROUTES}
 def rows(self,r):return self.drafts['petroleum/'+r]['facets']['series']
 def row(self,r,code):return next(x for x in self.rows(r) if x['sourceDefinition']['id']==code)
 def source(self,r):return {fid:{x['definition']['id']:x['definition'] for x in c.i.inventory('petroleum/'+r)[fid]} for fid in ['product','process','duoarea','series']}
 def test_identical_state_summary_reuses_decisions(self):
  for x in self.rows('sum/mkt'):self.assertIn('reusedDefinitionFrom',x);self.assertNotEqual(x['classification'],'pending')
 def test_stock_changes_never_stock_levels(self):
  for code in ['MCRSCUS1','MCESCUS1','MCSSCUS1']:
   x=self.row('sum/crdsnd',code);self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_days_and_percent_not_quantity(self):
  for code in ['M_EPC0_SPC_NUS_PER','M_EPC0_SPT_NUS_PER','M_EPC0_VSI_NUS_DAYS']:
   x=self.row('sum/crdsnd',code);self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_supply_adjustment_not_production(self):
  x=self.row('pnp/wprodrb','W_EPM0F_VUA_NUS_MBBLD');self.assertEqual(x['classification'],'out of vocabulary')
 def test_net_receipts_not_imports(self):
  xs=[x for x in self.rows('sum/snd') if 'Net Receipts by' in x['sourceDefinition']['name']];self.assertTrue(xs)
  for x in xs:self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_spr_receipts_not_imports(self):
  x=self.row('sum/crdsnd','M_EPC0_YRSD_NUS_MBBL');self.assertEqual(x['classification'],'out of vocabulary')
 def test_gross_trade_and_net_imports_separate(self):
  xs=[x for x in self.rows('sum/sndw') if 'Net Imports' in x['sourceDefinition']['name']];self.assertEqual(len(xs),3)
  for x in xs:self.assertEqual(x['classification'],'out of vocabulary')
 def test_spr_imports_are_component(self):
  x=self.row('sum/crdsnd','MCRIT_NUS-Z00_1');self.assertEqual((x['activity'],x['qualifierClassification']),('imports','subset'))
 def test_crude_demand_proxy_explicit_only(self):
  x=self.row('pnp/inpt','MCRRIUS1');self.assertEqual((x['product'],x['activity'],x['classification'],x['qualifier'],x['qualifierClassification']),('petroleum','consumption','subset','crude oil','whole product'));self.assertIn('proxy',x['basisLabel'])
 def test_weekly_crude_proxy_same_meaning(self):
  x=self.row('pnp/wiup','WCRRIUS2');self.assertEqual(x['qualifier'],'crude oil');self.assertEqual(x['activity'],'consumption')
 def test_gross_inputs_not_crude_only_even_when_title_says_crude(self):
  x=self.row('pnp/unc','MGIRIP12');self.assertIn('Crude Oil',x['sourceDefinition']['name']);self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_gross_inputs_not_consumption(self):
  x=self.row('pnp/wiup','WGIRIP32');self.assertEqual(x['classification'],'out of vocabulary')
 def test_biofuel_inputs_not_total_consumption(self):
  xs=[x for x in self.rows('pnp/inpt') if x.get('product')=='biofuels'];self.assertTrue(xs)
  for x in xs:self.assertEqual((x['classification'],x['activity']),('subset','consumption'));self.assertIn('total-energy',x['broaderCandidate'])
 def test_combined_refinery_output_labelled(self):
  x=self.row('pnp/refp','MTTRPUS1');self.assertEqual((x['classification'],x['activity']),('whole product','production'));self.assertIn('secondary production',x['sourceScope']);self.assertIn('net',x['basisLabel'])
 def test_refinery_and_blender_components_not_combined(self):
  for r,code in [('pnp/refp2','MTTRX_NUS_1'),('pnp/refp3','M_EP00_YPB_NUS_MBBL')]:self.assertEqual(self.row(r,code)['classification'],'subset')
 def test_finished_gasoline_whole_qualifier_only(self):
  x=self.row('pnp/refp','MGFRPUS1');self.assertEqual((x['classification'],x['qualifierClassification'],x['qualifier']),('subset','whole product','gasoline'))
 def test_plant_only_gasoline_component(self):
  x=self.row('sum/snd','M_EPM0F_YNP_R30_MBBLD');self.assertEqual(x['qualifierClassification'],'subset');self.assertIn('broaderCandidate',x)
 def test_grade_not_total_gasoline(self):
  x=self.row('pnp/refp','MG4RP_NUS_1');self.assertEqual(x['qualifierClassification'],'subset')
 def test_processing_gain_not_standalone_output(self):
  for r,code in [('pnp/refp','MPGRPUS1'),('pnp/refp3','M_EPPG_YPB_NUS_MBBL')]:self.assertEqual(self.row(r,code)['classification'],'out of vocabulary')
 def test_hydrogen_outside_vocabulary(self):self.assertEqual(c.product(c.PRODUCTS['EPOOOH'])['classification'],'out of vocabulary')
 def test_operable_vs_components(self):
  a=self.row('pnp/unc','MOCLEUS2');b=self.row('pnp/unc','MOCGGUS2');self.assertEqual((a['classification'],a['activity']),('whole product','capacity'));self.assertEqual(b['classification'],'subset')
 def test_utilization_not_capacity(self):
  x=self.row('pnp/unc','MOPUEUS2');self.assertEqual(x['classification'],'out of vocabulary');self.assertNotIn('activity',x)
 def test_calendar_day_unit_kept(self):
  x=self.row('pnp/wiup','W_NA_YRL_R20_MBBLD');self.assertEqual(x['unit'],'Thousand Barrels per Calendar Day')
 def test_nonoxygenated_metadata_variant_not_total(self):
  x=self.row('sum/sndw','WG3ST_R40_1');self.assertEqual((x['matchedProduct'],x['qualifierClassification']),('EPM0RN','subset'))
 def test_seeded_unknown_process_definitions_pending(self):
  rng=random.Random(20261029)
  for _ in range(100):
   d=copy.deepcopy(rng.choice(list(c.PROCESSES.values())));d['id']='UNKNOWN_'+str(rng.randrange(10**12));self.assertEqual(c.process(d)['classification'],'pending')
  d=copy.deepcopy(c.PROCESSES['YPR']);d['name']='Price';self.assertEqual(c.process(d)['classification'],'pending')
 def test_unit_conflict_pending(self):
  src=self.source('pnp/wiup');d=copy.deepcopy(src['series']['W_NA_YRL_R20_MBBLD']);d['name']=d['name'].replace('Thousand Barrels per Calendar Day','Dollars per Gallon');src['series'][d['id']]=d;self.assertEqual(c.series(d,'petroleum/pnp/wiup',src)['classification'],'pending')
 def test_unknown_legacy_process_not_guessed(self):
  src=self.source('pnp/unc');d=copy.deepcopy(src['series']['MOCLEUS2']);d['name']='U.S. Unknown Measure (Thousand Barrels per Day)';src['series'][d['id']]=d;self.assertEqual(c.series(d,'petroleum/pnp/unc',src)['classification'],'pending')
 def test_duplicate_series_consistency(self):
  seen={};fields=['classification','product','activity','qualifier','qualifierClassification']
  for v in self.drafts.values():
   for x in v['facets']['series']:
    key=json.dumps(x['sourceDefinition'],sort_keys=True);value={k:x.get(k) for k in fields}
    if key in seen:self.assertEqual(value,seen[key])
    seen[key]=value
 def test_all_definitions_and_provenance(self):
  self.assertEqual(len(self.drafts),15);self.assertEqual(sum(len(v['facets']['series']) for v in self.drafts.values()),14584)
  for route,v in self.drafts.items():
   self.assertTrue(v['complete']);inv=c.i.inventory(route)
   for fid,rows in v['facets'].items():
    self.assertEqual(len(rows),len(inv[fid]))
    for a,b in zip(rows,inv[fid]):self.assertEqual((a['sourceDefinition'],a['frequencies'],a['calls']),(b['definition'],b['frequencies'],b['calls']));self.assertEqual(a['publicationStatus'],'unverified')
if __name__=='__main__':unittest.main()
