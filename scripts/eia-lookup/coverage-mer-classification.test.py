"""Source-based MER regressions, not an independent or standard benchmark.
Expectations follow full EIA definitions and owner whole-product/qualifier rules.
Generation scope acceptance is deliberately deferred to the pending owner decision.
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
    def test_other_customer_price_not_total(self):
        self.assertEqual(self.item('ESOTUUS')['classification'],'subset')
    def test_whole_electricity_retail_sales_basis_not_lost_to_end_use_wording(self):
        for code in ['ESTCBUS','ESTCPUS']:
            r=self.item(code);self.assertEqual((r['classification'],r['activity']),('whole product','sales'))
    def test_sector_components_are_not_whole_sector(self):
        for code in ['CLKCPUS','NGPZPUS','NGINPUS']:
            self.assertEqual(self.item(code)['sectorCellClassification'],'subset')
    def test_generation_scope_decision_is_pending(self):
        self.assertIn('Pending owner decision',self.item('ELETPUS')['scopeReview'])
    def test_all_source_definitions_retained(self):
        source=m.i.inventory('total-energy')['msn']
        self.assertEqual(len(source),1103)
        self.assertTrue(all(m.classify(r['definition'])['sourceDefinition']==r['definition'] for r in source))
if __name__=='__main__':unittest.main()
