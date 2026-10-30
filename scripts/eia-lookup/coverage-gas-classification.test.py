"""Natural-gas source correspondence checks, not app tests or independent benchmarks."""
import importlib.util,unittest,random
from pathlib import Path
spec=importlib.util.spec_from_file_location('gas',Path(__file__).with_name('coverage-gas-classification.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GasTests(unittest.TestCase):
    def row(self,name,route='natural-gas/sum/lsum',code='synthetic'):return m.series({'id':code,'name':name},route)
    def test_three_whole_production_bases(self):
        for phrase in ['Gross Withdrawals','Dry Production','Marketed Production']:
            r=self.row('Texas Natural Gas '+phrase+' (MMcf)');self.assertEqual((r['classification'],r['activity']),('whole product','production'))
    def test_well_type_is_subset_even_with_gross_word(self):
        for phrase in ['Gross Withdrawals from Coalbed Wells','Withdrawals from Oil Wells','Gross Withdrawals from Shale Gas']:
            self.assertEqual(self.row('Texas Natural Gas '+phrase+' (MMcf)')['classification'],'subset')
    def test_deliveries_not_total_consumption(self):
        self.assertEqual(self.row('U.S. Natural Gas Total Consumption (MMcf)')['classification'],'whole product')
        self.assertEqual(self.row('Natural Gas Delivered to Consumers in the U.S. (MMcf)')['classification'],'subset')
    def test_vehicle_and_pipeline_each_not_whole_transportation(self):
        for phrase in ['Vehicle Fuel Consumption','Pipeline & Distribution Use','Pipeline and Distribution Use']:
            r=self.row('Texas Natural Gas '+phrase+' (MMcf)');self.assertEqual((r['sector'],r['sectorCellClassification']),('transportation','subset'))
    def test_named_sector_total_is_whole_only_in_sector(self):
        for phrase,sec in [('Residential Consumption','residential'),('Deliveries to Electric Power Consumers','electric power')]:
            r=self.row('Texas Natural Gas '+phrase+' (MMcf)');self.assertEqual((r['classification'],r['sector'],r['sectorCellClassification']),('subset',sec,'whole product'))
    def test_transport_for_others_not_total_sector(self):
        r=self.row('Texas Natural Gas Delivered to Residential Consumers for the Account of Others (MMcf)');self.assertEqual(r['sectorCellClassification'],'subset')
    def test_customers_vs_averages_and_subgroups(self):
        r=self.row('Texas Natural Gas Number of Residential Consumers (Count)');self.assertEqual((r['activity'],r['sectorCellClassification']),('customers','whole product'))
        r=self.row('Texas Natural Gas Number of Residential Consumers - Transported (Count)');self.assertEqual(r['sectorCellClassification'],'subset')
        self.assertEqual(self.row('Texas Natural Gas Average Annual Consumption per Commercial Consumer (Mcf)')['classification'],'out of vocabulary')
    def test_storage_flows_and_changes_are_not_stocks(self):
        for phrase in ['Underground Storage Withdrawals','Underground Storage Injections','LNG Storage Additions','in Underground Storage - Change in Working Gas from Same Month Previous Year']:
            self.assertEqual(self.row('Texas Natural Gas '+phrase+' (MMcf)')['classification'],'out of vocabulary')
    def test_storage_components_do_not_become_totals(self):
        for phrase in ['in Underground Storage (Base Gas)','Working Underground Storage Capacity','Underground Storage Salt Caverns Capacity']:
            self.assertEqual(self.row('Texas Natural Gas '+phrase+' (MMcf)')['classification'],'subset')
        self.assertEqual(self.row('Texas Natural Gas Underground Storage Volume (MMcf)')['classification'],'whole product')
    def test_storage_full_us_scope_starts_2013(self):
        for phrase in ['Underground Storage Volume','Underground Storage Capacity']:
            r=self.row('U.S. Natural Gas '+phrase+' (MMcf)');self.assertEqual(r['scopeConstraints'][0]['wholeScopeFrom'],'2013')
    def test_facility_count_not_capacity_or_customers(self):
        self.assertEqual(self.row('Texas Natural Gas Count of Underground Storage Capacity (Count)')['classification'],'out of vocabulary')
    def test_trade_total_and_partner_component_distinct(self):
        total=self.row('U.S. Natural Gas Exports (MMcf)');part=self.row('U.S. Natural Gas Exports to Canada (MMcf)')
        self.assertEqual(total['classification'],'whole product');self.assertEqual(part['classification'],'subset');self.assertIn('partners',part['placeRole'])
    def test_trade_modes_not_all_gas(self):
        for mode in ['Pipeline','LNG','Liquefied','Compressed']:
            r=self.row('U.S. Natural Gas '+mode+' Imports (MMcf)');self.assertEqual(r['classification'],'subset')
    def test_trade_price_does_not_become_volume(self):
        r=self.row('Price of U.S. Natural Gas Exports (Dollars per Thousand Cubic Feet)');self.assertEqual((r['activity'],r['classification']),('prices','whole product'))
    def test_interstate_and_net_flows_not_gross_trade(self):
        for name in ['Virginia Natural Gas Deliveries to Kentucky (MMcf)','Virginia Natural Gas Net Receipts From Kentucky (MMcf)']:
            self.assertEqual(self.row(name,'natural-gas/move/ist')['classification'],'out of vocabulary')
        self.assertEqual(self.row('U.S. Natural Gas Net Imports (Bcf)')['classification'],'out of vocabulary')
    def test_gas_liquids_gaseous_unit_does_not_make_whole_gas(self):
        r=self.row('U.S. Natural Gas Plant Liquids Production, Gaseous Equivalent (Bcf)');self.assertEqual((r['product'],r['classification']),('petroleum','subset'))
    def test_supplemental_and_processing_not_total_production(self):
        for phrase in ['Supplemental Gas - Biomass Gas','Processed','Input Supplemental Fuels']:
            self.assertEqual(self.row('U.S. Natural Gas '+phrase+' (MMcf)')['classification'],'out of vocabulary')
    def test_value_not_expenditure_or_unit_price(self):
        self.assertEqual(self.row('U.S. Imputed Value of Natural Gas Market Production (Thousand Dollars)')['classification'],'out of vocabulary')
    def test_exact_metadata_correction_retains_reporting_subset(self):
        r=self.row('Nevada Natural Gas Wellhead (Million Cubic Feet)',code='NA_EPG0_FWV_SNV_MMCF');self.assertEqual((r['activity'],r['classification']),('production','subset'));self.assertIn('classificationSource',r)
        self.assertEqual(self.row('New Natural Gas Wellhead (Million Cubic Feet)')['classification'],'pending')
    def test_truncated_price_units_require_source_evidence(self):
        review=m.i.read(m.i.EVIDENCE/'natural-gas-source-review.json')
        fixes=[x for x in review['metadataConflicts'] if x.get('classificationCorrection',{}).get('unitEvidenceCall')]
        self.assertEqual(len(fixes),3)
        for f in fixes:
            d=f['sourceDefinition'];r=m.series(d,'natural-gas/move/poe2');self.assertEqual((r['classification'],r['activity'],r['verifiedUnit']),('subset','prices','$/MCF'))
    def test_unknown_native_definition_does_not_pass(self):
        self.assertEqual(m.process({'id':'NEW'})['classification'],'pending');self.assertEqual(self.row('U.S. Natural Gas New Measure (Unknown Units)')['classification'],'pending')
    def test_pending_owner_price_scope_is_not_accepted(self):
        r=self.row('Texas Price of Natural Gas Delivered to Residential Consumers (Dollars per Thousand Cubic Feet)');self.assertTrue(r['sectorCellClassification'].startswith('pending'))
        part=self.row('Texas Price of Natural Gas Delivered to Residential Consumers by Marketers (Dollars per Thousand Cubic Feet)');self.assertEqual(part['sectorCellClassification'],'subset')
    def test_seeded_geography_text_cannot_change_measure(self):
        rng=random.Random(20261029)
        for _ in range(100):
            place=rng.choice(['U.S.','Texas','Other States','Federal Offshore'])
            phrase,status=rng.choice([('Total Consumption','whole product'),('Gross Withdrawals from Gas Wells','subset'),('Underground Storage Withdrawals','out of vocabulary')])
            self.assertEqual(self.row(place+' Natural Gas '+phrase+' (MMcf)')['classification'],status)
    def test_source_definitions_and_pending_scope_are_preserved(self):
        nodes=[n for n in m.i.read(m.i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('natural-gas/') and '/enr/' not in n['route']]
        self.assertEqual(len(nodes),27)
        for node in nodes:
            r=m.build(node)
            for fid,rows in r['facets'].items():
                self.assertEqual([x['sourceDefinition'] for x in rows],[x['definition'] for x in m.i.inventory(node['route'])[fid]])
                self.assertTrue(all(x['classification']!='pending' for x in rows),node['route'])
                self.assertTrue(all(x['publicationStatus']=='unverified' for x in rows))
            if node['route'] in ['natural-gas/pri/sum','natural-gas/pri/rescom','natural-gas/sum/lsum']:self.assertFalse(r['complete'])
if __name__=='__main__':unittest.main()
