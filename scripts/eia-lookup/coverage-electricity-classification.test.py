"""Source-based regression checks; not an independent standard benchmark.
Expectations precede implementation in electricity-source-review.json.
"""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('electricity',Path(__file__).with_name('coverage-electricity-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ElectricityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nodes={n['route']:n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('electricity/')}
    def col(self,route,key):return m.column(route,key,self.nodes[route]['data'][key])
    def test_retail_customers_are_in_locked_vocabulary(self):
        r=self.col(m.RETAIL,'customers');self.assertEqual((r['classification'],r['product'],r['activity']),('whole product','electricity','customers'))
    def test_sales_preserve_approved_consumption_basis(self):
        for route,key in [(m.RETAIL,'sales'),(m.PREFIX+'summary','total-retail-sales'),(m.PREFIX+'source-disposition','total-elect-indust')]:
            r=self.col(route,key);self.assertEqual(r['classification'],'whole product');self.assertEqual(r['activities'],['sales','consumption']);self.assertIn('excludes electricity generated and used on-site',r['basisLabel'])
    def test_net_metered_population_remains_subset(self):
        for key in ['customers','capacity']:self.assertEqual(self.col(m.PREFIX+'net-metering',key)['classification'],'subset')
    def test_api_whole_renewables_label_does_not_override_definition(self):
        r=m.fuel('AOR');self.assertEqual((r['classification'],r['product']),('subset','renewable'));self.assertIn('excludes hydroelectric',r['basisLabel'])
        self.assertEqual(m.fuel('REN')['classification'],'whole product')
    def test_all_size_pv_is_not_all_solar(self):
        for code in ['TPV','SPV','STH','DPV']:
            r=m.fuel(code);self.assertEqual((r['classification'],r['product']),('subset','solar'))
        r=m.fuel('TSN');self.assertEqual((r['classification'],r['generationScope']),('whole product','all sizes'))
    def test_biomass_collision_remains_unresolved(self):
        for code in ['OB2','OBW']:self.assertEqual(m.fuel(code)['classification'],'pending')
        self.assertEqual(m.fuel('BIO')['classification'],'whole product')
    def test_coal_and_petroleum_components_remain_subsets(self):
        for code in ['ANT','SUB','LIG','BIT','WOC','RC','PEL','PC','DFO','RFO']:self.assertEqual(m.fuel(code)['classification'],'subset')
    def test_all_fuel_input_is_not_electricity_consumption(self):
        r=m.fuel('ALL');self.assertEqual(r['product'],'electricity');self.assertEqual(r['inputProduct'],'total energy')
    def test_generating_fuel_is_not_total_consumption(self):
        for key in ['total-consumption','total-consumption-btu','consumption-for-eg','consumption-uto']:
            r=self.col(m.OPS,key);self.assertEqual((r['classification'],r['activity']),('subset','consumption'))
    def test_receipts_and_heat_content_are_not_consump_or_production(self):
        for key in ['receipts','receipts-btu','heat-content','ash-content','sulfur-content']:self.assertEqual(self.col(m.OPS,key)['classification'],'out of vocabulary')
    def test_state_profile_alias_cannot_widen_utility_ownership(self):
        for key in ['generation-elect-utils','generation-ipp','capacity-elec-utilities','capacity-ipp']:
            r=self.col(m.PREFIX+'summary',key);self.assertEqual(r['classification'],'subset');self.assertNotIn('sectorCellClassification',r)
    def test_owner_standing_rule_accepts_labelled_capacity_with_broader_preference(self):
        for route,key in [(m.PREFIX+'capability','capability'),(m.PREFIX+'summary','net-summer-capacity')]:
            r=self.col(route,key);self.assertEqual(r['classification'],'whole product');self.assertIn('utility-scale (1 MW and larger)',r['basisLabel']);self.assertIn('broader EIA total',r['selectionConstraint'])
    def test_receipt_price_acceptance_does_not_make_it_economy_wide(self):
        for key in ['cost','cost-per-btu']:
            r=self.col(m.OPS,key);self.assertEqual(r['classification'],'subset');self.assertEqual(r['sectorCellOverrides']['electric power'],'whole product');self.assertEqual(r['sectorCellOverrides']['industrial'],'subset');self.assertIn('EIA-923 reporting plants',r['basisLabel']);self.assertIn('broader EIA total',r['selectionConstraint'])
    def test_no_net_flow_or_balance_as_gross_trade(self):
        route=m.PREFIX+'source-disposition'
        for key in ['net-interstate-trade','total-supply','total-disposition','net-trade-index','estimated-losses']:self.assertEqual(self.col(route,key)['classification'],'out of vocabulary')
        self.assertEqual(self.col(route,'total-international-imports')['activity'],'imports')
        self.assertEqual(self.col(route,'total-international-exports')['activity'],'exports')
    def test_sector_components_are_not_whole_sector(self):
        for code in ['1','94','2','3','4','5','6','7','90']:
            r=m.facet(m.OPS,'sectorid',{'id':code});self.assertEqual(r['sectorCellClassification'],'subset')
        self.assertEqual(m.facet(m.OPS,'sectorid',{'id':'98'})['sectorCellClassification'],'whole product')
    def test_unknown_is_not_default_whole(self):
        self.assertEqual(m.fuel('UNREVIEWED')['classification'],'pending')
        self.assertEqual(m.column(m.RETAIL,'unknown',{})['classification'],'pending')
    def test_summary_ranks_emissions_and_prime_source_outside(self):
        route=m.PREFIX+'summary'
        for key,d in self.nodes[route]['data'].items():
            if d.get('units')=='rank' or key.startswith(('sulfer','carbon','nitrogen')) or key=='prime-source':self.assertEqual(self.col(route,key)['classification'],'out of vocabulary',key)
    def test_source_definitions_and_all_six_routes_preserved(self):
        self.assertEqual(len(self.nodes),6)
        for route,node in self.nodes.items():
            out=m.build(node)
            self.assertEqual({r['id']:r['sourceDefinition'] for r in out['dataColumns']},node['data'])
            self.assertTrue(all(r['publicationStatus']=='unverified' for r in out['dataColumns']))
            for fid,rows in out['facets'].items():self.assertEqual([r['sourceDefinition'] for r in rows],[r['definition'] for r in m.i.inventory(route)[fid]])
    def test_incomplete_definitions_keep_route_incomplete(self):
        self.assertFalse(m.build(self.nodes[m.OPS])['complete'])
if __name__=='__main__':unittest.main()
