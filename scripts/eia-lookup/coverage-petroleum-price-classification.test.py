"""Source-based petroleum-price regressions; not a standard reference benchmark."""
import importlib.util,random,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-petroleum-price-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PetroleumPriceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nodes={n['route']:n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in m.ROUTES}
        cls.inventories={r:m.i.inventory(r) for r in cls.nodes}
    def row(self,route,code=None,name=None):
        inv=self.inventories[route];d=next(x['definition'] for x in inv['series'] if (x['definition']['id']==code if code else x['definition']['name']==name))
        return m.series(d,route,{fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea']})
    def test_all_grade_all_formulation_gasoline_not_whole_petroleum(self):
        r=self.row('petroleum/pri/gnd','EMM_EPM0_PTE_NUS_DPG')
        self.assertEqual((r['product'],r['classification'],r['qualifier'],r['qualifierClassification']),('petroleum','subset','gasoline','whole product'));self.assertIn('including taxes',r['basisLabel'])
    def test_regular_and_formulations_remain_components(self):
        for code in ['EPMR','EPMM','EPMP','EPM0R','EPM0U','EPM0X']:
            r=m.product(m.PRODUCTS[code]);self.assertEqual(r['qualifierClassification'],'subset')
        for code in ['EMM_EPMR_PTE_NUS_DPG','EMM_EPM0U_PTE_NUS_DPG']:
            self.assertEqual(self.row('petroleum/pri/gnd',code)['qualifierClassification'],'subset')
    def test_diesel_and_aviation_are_not_motor_gasoline(self):
        for code in ['EPD2D','EPPV']:
            r=m.product(m.PRODUCTS[code]);self.assertEqual(r['classification'],'subset');self.assertNotIn('qualifier',r)
    def test_all_seller_prices_and_refiner_prices_keep_different_scope(self):
        for code in ['PTA','PWA']:self.assertEqual(m.process(m.PROCESSES[code])['classification'],'whole product')
        for code in ['PTG','PWG','PTR','PBR','PDR','PRG']:
            r=m.process(m.PROCESSES[code]);self.assertEqual(r['classification'],'subset');self.assertIn('broader',r['selectionConstraint'])
    def test_transaction_components_not_broader_totals(self):
        for code in ['PBS','PDS','PRA','PTC','POA','POR']:self.assertEqual(m.process(m.PROCESSES[code])['classification'],'subset')
    def test_process_retail_sales_wording_stays_prices(self):
        for code in ['PTE','PTA','PTG']:self.assertEqual(m.process(m.PROCESSES[code])['activity'],'prices')
    def test_sector_prices_keep_sector_components(self):
        for code,sector in [('PRS','residential'),('PRT','residential'),('PCS','commercial'),('PIN','industrial')]:
            r=m.process(m.PROCESSES[code]);self.assertEqual(r['sector'],sector);self.assertEqual(r['classification'],'subset');self.assertEqual(r['sectorCellClassification'],'whole product')
        self.assertEqual(m.process(m.PROCESSES['PPL'])['sectorCellClassification'],'subset')
    def test_import_cost_under_move_route_remains_price(self):
        a=self.row('petroleum/pri/imc1','I000000004');b=self.row('petroleum/move/imc1','I000000004');self.assertEqual(a,b);self.assertEqual(b['activity'],'prices')
    def test_total_crude_import_basis_and_foreign_partner_distinct(self):
        total=self.row('petroleum/pri/imc1','I000000004');part=self.row('petroleum/pri/imc1','IMX0000004')
        self.assertEqual(total['qualifierClassification'],'whole product');self.assertEqual(part['qualifierClassification'],'subset');self.assertEqual(part['subjectCode'],'USA');self.assertIn('partner',part['placeRole'])
    def test_landed_not_fob_basis(self):
        a=self.row('petroleum/pri/land1','I000000008');b=self.row('petroleum/pri/imc1','I000000004')
        self.assertEqual(a['qualifierClassification'],'whole product');self.assertIn('excludes discharge-port fees',a['basisLabel']);self.assertNotEqual(a['basisLabel'],b['basisLabel'])
    def test_named_crude_stream_and_gravity_not_all_crude(self):
        for route in ['petroleum/pri/dfp2','petroleum/pri/dfp3','petroleum/pri/imc2','petroleum/pri/imc3','petroleum/pri/land2','petroleum/pri/land3']:
            for x in self.inventories[route]['series']:self.assertEqual(self.row(route,x['definition']['id'])['qualifierClassification'],'subset')
    def test_first_purchase_partial_places_do_not_become_state_or_us_total(self):
        for code in ['F009960__3','F005061__3','F003075__3','F005071__3']:
            r=self.row('petroleum/pri/dfp1',code);self.assertEqual(r['qualifierClassification'],'subset')
        for code in ['F000000__3','F003048__3']:
            r=self.row('petroleum/pri/dfp1',code);self.assertEqual(r['qualifierClassification'],'whole product');self.assertIn('Producing origin',r['placeRole'])
    def test_composite_acquisition_preferred_to_origin_components(self):
        for code,expected in [('R0000____3','whole product'),('R0100____3','subset'),('R0200____3','subset')]:
            r=self.row('petroleum/pri/rac2',code);self.assertEqual(r['qualifierClassification'],expected);self.assertEqual(r['placeRole'],'Intended refinery destination')
    def test_price_unit_and_native_unit_must_agree(self):
        inv=self.inventories['petroleum/pri/gnd'];source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea']}
        for code,name in [('EMM_EPM0_PTE_NUS_DPG','U.S. All Grades All Formulations Retail Gasoline Prices (Thousand Barrels)'),('EMM_EPM0_PTE_NUS_DPB','U.S. All Grades All Formulations Retail Gasoline Prices (Dollars per Gallon)')]:
            self.assertEqual(m.series({'id':code,'name':name},'petroleum/pri/gnd',source)['classification'],'pending')
    def test_full_name_cannot_contradict_native_total(self):
        inv=self.inventories['petroleum/pri/gnd'];source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea']}
        r=m.series({'id':'EMM_EPM0_PTE_NUS_DPG','name':'U.S. Regular Retail Gasoline Prices (Dollars per Gallon)'},'petroleum/pri/gnd',source)
        self.assertEqual(r['classification'],'pending')
    def test_unsupported_code_cannot_borrow_valid_name_seeded(self):
        rng=random.Random(20261029)
        for _ in range(100):
            d={'id':'NEW'+str(rng.randrange(1000000)),'name':rng.choice(['Total Gasoline','Crude Oil','Retail Sales','Composite Acquisition Cost'])}
            self.assertEqual(m.product(d)['classification'],'pending');self.assertEqual(m.process(d)['classification'],'pending')
    def test_unknown_and_changed_definitions_remain_pending(self):
        self.assertEqual(m.product({'id':'EPM0','name':'Regular Gasoline'})['classification'],'pending')
        self.assertEqual(m.process({'id':'PTE','name':'Consumption'})['classification'],'pending')
        self.assertEqual(m.series({'id':'NEW','name':'Unknown (Dollars per Gallon)'},'petroleum/pri/new',{})['classification'],'pending')
    def test_spot_price_not_added_by_commodity_name(self):
        r=m.series({'id':'NEW','name':'WTI Spot Price (Dollars per Barrel)'},'petroleum/pri/dfp2',{});self.assertEqual(r['classification'],'out of vocabulary')
    def test_native_definition_counts_and_provenance_preserved(self):
        self.assertEqual(len(self.nodes),25);self.assertEqual(sum(len(x['series']) for x in self.inventories.values()),9071)
        for route,node in self.nodes.items():
            r=m.build(node);self.assertTrue(r['complete'],route)
            self.assertEqual({x['id']:x['sourceDefinition'] for x in r['dataColumns']},node['data'])
            for fid,rows in r['facets'].items():
                original=self.inventories[route][fid];self.assertEqual([(x['sourceDefinition'],x['frequencies'],x['calls']) for x in rows],[(x['definition'],x['frequencies'],x['calls']) for x in original])
                self.assertTrue(all(x['publicationStatus']=='unverified' for x in rows))
    def test_no_price_family_series_becomes_whole_petroleum(self):
        for n in self.nodes.values():self.assertTrue(all(r['classification']=='subset' for r in m.build(n)['facets']['series']))
if __name__=='__main__':unittest.main()
