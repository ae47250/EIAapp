"""Source-based MER regressions, not an independent or standard benchmark.
Expectations follow full EIA definitions and owner whole-product/qualifier rules.
Generation scope expectations were recorded in generation-scope-review.json before edits.
"""
import importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('mer',Path(__file__).with_name('coverage-mer-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MERTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.rows={r['definition']['id']:r['definition'] for r in m.i.inventory('total-energy')['msn']}
    def item(self,code):return m.classify(self.rows[code])
    def test_ratios_counts_and_balances_are_not_observations_of_requested_activity(self):
        for code in ['NUETKUS','NGPRKUS','CLCASUS','NGNWPUS','NXSIPUS','NGAJPUS','PASCPUS','URPRPUS','BTVHNUS','PCFRRUS','ENDNPUS']:
            self.assertEqual(self.item(code)['classification'],'out of vocabulary',code)
    def test_monetary_trade_value_is_trade_not_total_end_use_expenditure(self):
        for code,activity in [('TEIMVUS','imports'),('TEEXVUS','exports'),('PAIMVUS','imports'),('PAEXVUS','exports')]:
            self.assertEqual(self.item(code)['activity'],activity)
    def test_storage_is_stock_not_withdrawal_flow(self):
        r=self.item('NGUSPUS');self.assertEqual((r['classification'],r['product'],r['activity']),('whole product','natural gas','storage'))
        self.assertEqual(self.item('NGNWPUS')['classification'],'out of vocabulary')
    def test_ngpl_is_petroleum_component_not_natural_gas_total(self):
        r=self.item('NGELPUS');self.assertEqual((r['classification'],r['product'],r['activity']),('subset','petroleum','production'))
    def test_gross_marketed_and_dry_are_allowed_gas_bases(self):
        for code in ['NGGWPUS','NGMPPUS','NGPRPUS']:
            r=self.item(code);self.assertEqual((r['classification'],r['product'],r['activity']),('whole product','natural gas','production'))
    def test_consumption_for_generation_stays_consumption(self):
        self.assertEqual(self.item('NGECPUS')['activity'],'consumption')
        self.assertEqual(self.item('NGETPUS')['activity'],'generation')
    def test_product_electric_power_words_are_not_a_sector(self):
        for code in ['NUETPUS','NUETBUS','HVTCBUS','HVETPUS']:
            self.assertNotIn('sector',self.item(code),code)
        self.assertEqual(self.item('NUEGPUS')['sector'],'electric power')
    def test_dual_consumption_production_definition_preserved(self):
        for code in ['NUETBUS','HVTCBUS','GETCBUS','WYTCBUS','SOTCBUS']:
            self.assertEqual(self.item(code)['activities'],['consumption','production'])
    def test_product_definition_overrides_ambiguous_prefix(self):
        r=self.item('REACBUS');self.assertEqual(r['product'],'biofuels');self.assertEqual(r['sector'],'transportation')
    def test_partner_is_not_subject_country(self):
        for code in ['LNEXPJA','PAIMPCN','COIMUCL']:
            r=self.item(code);self.assertEqual(r['classification'],'subset');self.assertIsNone(r['placeKind']);self.assertNotIn('placeCode',r)
    def test_subnational_no_place_facet_cannot_be_mapped_as_state(self):
        r=self.item('PAPRPAK');self.assertIsNone(r['placeKind']);self.assertEqual(r['qualifierClassification'],'subset')
    def test_crude_is_only_qualified_petroleum(self):
        r=self.item('PAPRPUS');self.assertEqual((r['classification'],r['qualifier'],r['qualifierClassification']),('subset','crude oil','whole product'))
    def test_gasoline_grade_stays_narrower_than_all_gasoline(self):
        r=self.item('PUUCUUS') if 'PUUCUUS' in self.rows else next(m.classify(d) for d in self.rows.values() if d['name'].startswith('Unleaded Premium Gasoline'))
        self.assertEqual(r['qualifier'],'gasoline');self.assertEqual(r['qualifierClassification'],'subset')
    def test_owner_gas_price_label_preserves_sector_and_units(self):
        for code in ['NGRCUUS','NGCCUUS','NGINUUS']:
            r=self.item(code);self.assertEqual(r['classification'],'subset');self.assertEqual(r['sectorCellClassification'],'whole product');self.assertIn('sales price; excludes gas transported for other sellers',r['basisLabel']);self.assertIn('Dollars per Thousand Cubic Feet',r['basisLabel']);self.assertIn('broader EIA total',r['selectionConstraint'])
    def test_other_customer_price_not_total(self):
        self.assertEqual(self.item('ESOTUUS')['classification'],'subset')
    def test_whole_electricity_retail_sales_basis_not_lost_to_end_use_wording(self):
        for code in ['ESTCBUS','ESTCPUS']:
            r=self.item(code);self.assertEqual((r['classification'],r['activity']),('whole product','sales'))
    def test_sector_components_are_not_whole_sector(self):
        for code in ['CLKCPUS','NGPZPUS','NGINPUS']:
            self.assertEqual(self.item(code)['sectorCellClassification'],'subset')
    def test_combined_solar_total_has_preference(self):
        r=self.item('SOTEPUS')
        self.assertEqual((r['classification'],r['generationScope']),('whole product','all sizes'))
        self.assertIn('Prefer',r['selectionPreference'])
        self.assertNotIn('omittedSmallScaleEstimate',r)
    def test_all_sectors_does_not_mean_all_facility_sizes(self):
        for code in ['SOETPUS','SOT5PUS']:
            r=self.item(code)
            self.assertEqual((r['classification'],r['generationScope']),('whole product','utility-scale'))
            self.assertIn('utility-scale (1 MW and larger)',r['basisLabel'])
            self.assertIn('excludes small-scale (e.g. rooftop) generation',r['basisLabel'])
            self.assertIn('Fallback only',r['selectionConstraint'])
    def test_utility_scale_sector_totals_keep_sector_boundary(self):
        for code in ['SOC5PUS','SOI5PUS','SOEGPUS']:
            r=self.item(code)
            self.assertEqual((r['classification'],r['sectorCellClassification']),('subset','whole product'))
            self.assertEqual(r['generationScope'],'utility-scale')
    def test_small_scale_only_is_still_subset(self):
        for code in ['SOT7PUS','SOC7PUS','SOR7PUS','SOI7PUS']:
            r=self.item(code)
            self.assertEqual((r['classification'],r['generationScope']),('subset','small-scale only'))
            self.assertNotIn('selectionPreference',r)
            if 'sector' in r:self.assertEqual(r['sectorCellClassification'],'subset')
    def test_solar_exclusion_notice_respects_product_and_sector(self):
        for code in ['ELETPUS','ELC5PUS','ELI5PUS','SOC5PUS','SOI5PUS']:
            self.assertEqual(self.item(code)['omittedSmallScaleEstimate'],'solar photovoltaic')
        for code in ['ELEGPUS','SOEGPUS','NGETPUS','WYETPUS','NUETPUS']:
            r=self.item(code)
            self.assertEqual(r['generationScope'],'utility-scale')
            self.assertNotIn('omittedSmallScaleEstimate',r)
    def test_scope_labels_keep_generation_and_other_measures_distinct(self):
        for d in self.rows.values():
            r=m.classify(d)
            if r.get('activity')!='generation':
                self.assertNotIn('generationScope',r)
                if 'selectionConstraint' in r:
                    self.assertIn(r['activity'],['capacity','prices'])
                    self.assertIn(r['scopeDecision'],['standingScopeRule','headlineSectorGasPrices'])
                    self.assertIn('broader EIA total',r['selectionConstraint'])
                    if r['activity']=='capacity':
                        self.assertIn('capacity-scope-source-review.json',r['scopeEvidence'])
                        self.assertIn('End of period',r['timeMeaning'])
                        self.assertIn('operable nuclear generating units' if d['id']=='NUGBPUS' else 'utility-scale',r['basisLabel'])
                    else:
                        self.assertTrue(any(x in r['basisLabel'] for x in ['excludes gas transported for other sellers','EIA-923 reporting plants']))
    def test_generation_scope_no_longer_awaits_owner(self):
        for d in self.rows.values():self.assertNotIn('scopeReview',m.classify(d))
    def test_all_source_definitions_retained(self):
        source=m.i.inventory('total-energy')['msn']
        self.assertEqual(len(source),1103)
        self.assertTrue(all(m.classify(r['definition'])['sourceDefinition']==r['definition'] for r in source))
if __name__=='__main__':unittest.main()
