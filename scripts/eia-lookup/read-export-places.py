# Independent read of the actual downloaded workbook, using the standard library.
import sys, json, zipfile, posixpath
import xml.etree.ElementTree as ET
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
with zipfile.ZipFile(sys.argv[1]) as z:
    workbook=ET.fromstring(z.read('xl/workbook.xml'))
    sheet=next(s for s in workbook.find('s:sheets',n) if s.attrib['name']=='All_Data')
    rid=sheet.attrib['{'+n['r']+'}id']
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target=next(r.attrib['Target'] for r in rels if r.attrib['Id']==rid)
    root=ET.fromstring(z.read(posixpath.normpath('xl/'+target)))
    def text(c): return ''.join(c.itertext())
    rows=[{''.join(filter(str.isalpha,c.attrib['r'])):text(c) for c in row} for row in root.find('s:sheetData',n)]
    assert rows[0].get('E')=='Country' and rows[0].get('F')=='Country code', 'Unexpected export columns'
    pairs=sorted({(row.get('F',''),row.get('E','')) for row in rows[1:] if row.get('F')})
    print(json.dumps([{'code':code,'name':name} for code,name in pairs]))
