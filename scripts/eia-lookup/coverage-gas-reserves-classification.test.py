"""Source-defined regressions; not a public benchmark or independent holdout."""
import importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('gas',Path(__file__).with_name('coverage-gas-reserves-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReserveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nodes=[n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('natural-gas/enr/')]
    def row(self,name):return m.series({'id':'synthetic','name':name})
    def test_expected_future_dry_is_reserves_not_production(self):
        r=self.row('U.S. Dry Natural Gas Expected Future Production (Billion Cubic Feet)')
        self.assertEqual((r['product'],r['activity'],r['classification']),('natural gas','reserves','whole product'))
        self.assertEqual(m.process({'id':'R11'})['activity'],'reserves')
    def test_report_year_production_is_separate(self):
        r=self.row('U.S. Dry Natural Gas Reserves Estimated Production (Billion Cubic Feet)')
        self.assertEqual((r['activity'],r['classification']),('production','whole product'))
        self.assertIn('reserves survey',r['basisLabel'])
    def test_wet_and_dry_are_labelled_bases(self):
        for name in ['Dry Natural Gas Expected Future Production','Natural Gas, Wet After Lease Separation Proved Reserves']:
            r=self.row('Texas '+name+' (Billion Cubic Feet)');self.assertEqual(r['classification'],'whole product');self.assertEqual(r['activity'],'reserves');self.assertIn('year end',r['basisLabel'])
    def test_gas_components_are_not_total_gas(self):
        for product in ['Associated-Dissolved Natural Gas','Nonassociated Natural Gas','Coalbed Methane','Shale']:
            r=self.row('U.S. '+product+' Proved Reserves (Billion Cubic Feet)');self.assertEqual((r['product'],r['classification']),('natural gas','subset'))
    def test_reserve_transfers_never_become_product_sales(self):
        for tail in ['Reserves Divestitures','Reserves Acquisitions','Reserves Acquisitions Acquisitions']:
            self.assertEqual(self.row('Texas Natural Gas Liquids Lease Condensate, '+tail+' (Million Barrels)')['classification'],'out of vocabulary')
        for code in ['R05','R15','R25','R35','R45','R5105','R5305','R5605']:self.assertEqual(m.process({'id':code})['classification'],'out of vocabulary')
    def test_changes_do_not_become_reserve_totals(self):
        for tail in ['Reserves Adjustments','Reserves Revision Increases','Reserves Revision Decreases','Reserves Extensions and Discoveries','New Reservoir Discoveries in Old Fields']:
            self.assertEqual(self.row('U.S. Dry Natural Gas '+tail+' (Billion Cubic Feet)')['classification'],'out of vocabulary')
    def test_nonproducing_is_a_population_subset(self):
        r=self.row('Texas Natural Gas Wet After Lease Separation, Reserves in Nonproducing Reservoirs (Bcf)')
        self.assertEqual((r['classification'],r['activity']),('subset','reserves'));self.assertIn('Nonproducing',r['populationRestriction'])
    def test_liquids_are_not_whole_natural_gas(self):
        for label in ['Natural Gas Plant Liquids','Natural Gas Liquids','Natural Gas Liquids Lease Condensate']:
            r=self.row('U.S. '+label+' Proved Reserves (Million Barrels)');self.assertEqual((r['classification'],r['product']),('subset','petroleum'));self.assertNotIn('qualifier',r)
    def test_plant_liquids_expected_future_is_not_current_output(self):
        r=self.row('U.S. Natural Gas Plant Liquids, Expected Future Production (Million Barrels)');self.assertEqual((r['classification'],r['activity']),('subset','reserves'))
    def test_crude_qualifier_does_not_widen_petroleum(self):
        r=self.row('U.S. Crude Oil + Lease Condensate Proved Reserves (Million Barrels)')
        self.assertEqual((r['classification'],r['qualifier'],r['qualifierClassification']),('subset','crude oil','whole product'));self.assertIn('Lease Condensate',r['basisLabel'])
    def test_nonproducing_crude_is_not_qualifier_total(self):
        r=self.row('Texas Crude Oil Reserves in Nonproducing Reservoirs (Million Barrels)');self.assertEqual(r['qualifierClassification'],'subset')
    def test_unreviewed_codes_units_and_titles_stay_pending(self):
        self.assertEqual(m.process({'id':'NEW'})['classification'],'pending');self.assertEqual(m.product({'id':'NEW'})['classification'],'pending')
        for name in ['U.S. Natural Gas Proved Reserves (New Units)','U.S. Natural Gas Experimental Reserves (Bcf)','U.S. Natural Gas Expected Future Production (Bcf)']:
            self.assertEqual(self.row(name)['classification'],'pending')
    def test_seeded_place_prefix_does_not_determine_measure(self):
        rng=random.Random(20261029)
        prefixes=['Texas','U.S.','Other States','Federal Offshore','California - Coastal Region Onshore']
        measures=[('Dry Natural Gas Expected Future Production','whole product','reserves'),('Coalbed Methane Production','subset','production'),('Shale Proved Reserves','subset','reserves')]
        for _ in range(100):
            label,status,activity=rng.choice(measures);r=self.row(rng.choice(prefixes)+' '+label+' (Billion Cubic Feet)')
            self.assertEqual((r['classification'],r['activity']),(status,activity));self.assertNotIn('placeCode',r)
    def test_all_definitions_preserved_without_availability_claim(self):
        self.assertEqual(len(self.nodes),12)
        for node in self.nodes:
            r=m.build(node);self.assertTrue(r['complete'],node['route'])
            for fid,rows in r['facets'].items():
                self.assertEqual([x['sourceDefinition'] for x in rows],[x['definition'] for x in m.i.inventory(node['route'])[fid]])
                self.assertTrue(all(x['publicationStatus']=='unverified' for x in rows))
if __name__=='__main__':unittest.main()
